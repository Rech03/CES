from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q, Count
from datetime import timedelta

from .models import StudentAchievement, BadgeType, EarnedBadge, DailyActivity
from .serializers import (
    StudentAchievementSerializer, BadgeTypeSerializer, EarnedBadgeSerializer,
    AchievementDashboardSerializer, BadgeCollectionSerializer
)
from .services import AchievementService
from users.models import User


class IsStudentPermission(permissions.BasePermission):
    """Permission for students only"""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_student


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsStudentPermission])
def student_achievement_dashboard(request):
    """Get student's achievement dashboard data"""
    student = request.user
    
    # Get or create student achievement record
    achievement, created = StudentAchievement.objects.get_or_create(student=student)
    
    if created:
        # Update stats for new achievement record
        achievement.update_stats()
    
    # Get recent achievements (last 3 earned badges)
    recent_achievements = EarnedBadge.objects.filter(
        student=student
    ).select_related('badge_type').order_by('-earned_at')[:3]
    
    # Get daily streak info
    today = timezone.now().date()
    streak_data = {
        'current_streak': achievement.current_streak,
        'best_streak': achievement.best_streak,
        'streak_days': achievement.current_streak,
        'is_active_today': achievement.last_activity_date == today
    }
    
    # Performance stats
    performance_stats = {
        'perfect_scores': achievement.perfect_scores,
        'average_score': round(achievement.average_score, 1),
        'study_time_hours': int(achievement.total_study_time.total_seconds() // 3600),
        'level': achievement.level,
        'total_xp': achievement.total_xp,
        'xp_to_next_level': achievement.xp_to_next_level
    }
    
    dashboard_data = {
        'achievement_overview': StudentAchievementSerializer(achievement).data,
        'recent_achievements': [
            {
                'badge_name': badge.badge_type.name,
                'badge_icon': badge.badge_type.icon,
                'badge_color': badge.badge_type.color,
                'earned_date': badge.earned_at.strftime('%b %d'),
                'xp_reward': badge.badge_type.xp_reward
            } for badge in recent_achievements
        ],
        'streak_info': streak_data,
        'performance_stats': performance_stats,
        'total_badges': achievement.badges_earned
    }
    
    return Response(dashboard_data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsStudentPermission])
def badge_collection(request):
    """Get student's badge collection with filter options"""
    student = request.user
    filter_type = request.query_params.get('filter', 'all')  # all, earned, gold, legendary
    
    # Get all badge types
    if filter_type == 'all':
        badge_types = BadgeType.objects.filter(is_active=True)
    else:
        badge_types = BadgeType.objects.filter(
            is_active=True,
            rarity=filter_type
        )
    
    # Get earned badges
    earned_badges = EarnedBadge.objects.filter(
        student=student
    ).values_list('badge_type_id', flat=True)
    
    badge_collection_data = []
    
    for badge_type in badge_types:
        is_earned = badge_type.id in earned_badges
        earned_badge = None
        
        if is_earned:
            earned_badge = EarnedBadge.objects.filter(
                student=student, 
                badge_type=badge_type
            ).first()
        
        badge_data = {
            'id': badge_type.id,
            'name': badge_type.name,
            'description': badge_type.description,
            'category': badge_type.category,
            'rarity': badge_type.rarity,
            'icon': badge_type.icon,
            'color': badge_type.color,
            'xp_reward': badge_type.xp_reward,
            'is_earned': is_earned,
            'earned_at': earned_badge.earned_at if earned_badge else None,
            'progress': AchievementService.get_badge_progress(student, badge_type)
        }
        
        badge_collection_data.append(badge_data)
    
    # Count badges by rarity
    rarity_counts = {
        'total': badge_types.count(),
        'earned': len([b for b in badge_collection_data if b['is_earned']]),
        'common': badge_types.filter(rarity='common').count(),
        'earned_rarity': badge_types.filter(rarity='earned').count(),
        'gold': badge_types.filter(rarity='gold').count(),
        'legendary': badge_types.filter(rarity='legendary').count()
    }
    
    return Response({
        'badges': badge_collection_data,
        'rarity_counts': rarity_counts,
        'filter_applied': filter_type
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsStudentPermission])
def achievement_history(request):
    """Get student's achievement history"""
    student = request.user
    days = int(request.query_params.get('days', 30))
    
    # Get daily activities for the specified period
    start_date = timezone.now().date() - timedelta(days=days)
    daily_activities = DailyActivity.objects.filter(
        student=student,
        date__gte=start_date
    ).order_by('-date')
    
    # Get earned badges in this period
    earned_badges = EarnedBadge.objects.filter(
        student=student,
        earned_at__date__gte=start_date
    ).select_related('badge_type').order_by('-earned_at')
    
    history_data = {
        'daily_activities': [
            {
                'date': activity.date.isoformat(),
                'quizzes_completed': activity.quizzes_completed,
                'xp_earned': activity.xp_earned,
                'study_time_minutes': int(activity.study_time.total_seconds() // 60)
            } for activity in daily_activities
        ],
        'badges_earned': [
            {
                'badge_name': badge.badge_type.name,
                'badge_icon': badge.badge_type.icon,
                'badge_color': badge.badge_type.color,
                'earned_at': badge.earned_at,
                'xp_reward': badge.badge_type.xp_reward,
                'course': badge.course.code if badge.course else None
            } for badge in earned_badges
        ],
        'period_days': days
    }
    
    return Response(history_data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsStudentPermission])
def available_badges(request):
    """Get all available badges and their requirements"""
    badge_types = BadgeType.objects.filter(is_active=True).order_by('category', 'rarity')
    
    badges_by_category = {}
    for badge in badge_types:
        category = badge.get_category_display()
        if category not in badges_by_category:
            badges_by_category[category] = []
        
        badge_data = BadgeTypeSerializer(badge).data
        badge_data['requirements'] = AchievementService.get_badge_requirements(badge)
        badges_by_category[category].append(badge_data)
    
    return Response({
        'badges_by_category': badges_by_category,
        'total_badges': badge_types.count()
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsStudentPermission])
def check_achievements(request):
    """Manually trigger achievement checking for student"""
    student = request.user
    
    # Update student stats
    achievement, created = StudentAchievement.objects.get_or_create(student=student)
    achievement.update_stats()
    achievement.update_streak()
    
    # Check for new badges
    new_badges = AchievementService.check_and_award_badges(student)
    
    return Response({
        'message': 'Achievement check completed',
        'new_badges_earned': len(new_badges),
        'badges': [
            {
                'name': badge.badge_type.name,
                'icon': badge.badge_type.icon,
                'color': badge.badge_type.color,
                'xp_reward': badge.badge_type.xp_reward
            } for badge in new_badges
        ],
        'current_level': achievement.level,
        'total_xp': achievement.total_xp
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsStudentPermission])
def leaderboard(request):
    """Get achievement leaderboard"""
    leaderboard_type = request.query_params.get('type', 'xp')  # xp, badges, streak
    course_id = request.query_params.get('course_id')
    
    # Get students based on course filter
    if course_id:
        from courses.models import CourseEnrollment
        student_ids = CourseEnrollment.objects.filter(
            course_id=course_id,
            is_active=True
        ).values_list('student_id', flat=True)
        achievements = StudentAchievement.objects.filter(student_id__in=student_ids)
    else:
        achievements = StudentAchievement.objects.all()
    
    # Order by leaderboard type
    if leaderboard_type == 'xp':
        achievements = achievements.order_by('-total_xp')[:10]
    elif leaderboard_type == 'badges':
        achievements = achievements.order_by('-badges_earned')[:10]
    elif leaderboard_type == 'streak':
        achievements = achievements.order_by('-current_streak')[:10]
    
    leaderboard_data = []
    for i, achievement in enumerate(achievements, 1):
        student_data = {
            'rank': i,
            'student_name': achievement.student.get_full_name(),
            'student_number': achievement.student.student_number,
            'level': achievement.level,
            'total_xp': achievement.total_xp,
            'badges_earned': achievement.badges_earned,
            'current_streak': achievement.current_streak,
            'average_score': round(achievement.average_score, 1)
        }
        leaderboard_data.append(student_data)
    
    return Response({
        'leaderboard': leaderboard_data,
        'type': leaderboard_type,
        'course_filtered': bool(course_id)
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsStudentPermission])
def achievement_stats(request):
    """Get detailed achievement statistics"""
    student = request.user
    achievement = StudentAchievement.objects.get(student=student)
    
    # Get badge counts by category and rarity
    earned_badges = EarnedBadge.objects.filter(student=student)
    
    badge_stats = {
        'total_badges': earned_badges.count(),
        'by_category': {},
        'by_rarity': {},
        'recent_badges': earned_badges.order_by('-earned_at')[:5].values(
            'badge_type__name', 'badge_type__icon', 'badge_type__color', 'earned_at'
        )
    }
    
    # Count by category
    for category_choice in BadgeType.BADGE_CATEGORIES:
        category_key = category_choice[0]
        count = earned_badges.filter(badge_type__category=category_key).count()
        badge_stats['by_category'][category_key] = count
    
    # Count by rarity
    for rarity_choice in BadgeType.BADGE_RARITIES:
        rarity_key = rarity_choice[0]
        count = earned_badges.filter(badge_type__rarity=rarity_key).count()
        badge_stats['by_rarity'][rarity_key] = count
    
    # Activity stats for last 7 days
    week_ago = timezone.now().date() - timedelta(days=7)
    weekly_activities = DailyActivity.objects.filter(
        student=student,
        date__gte=week_ago
    ).order_by('date')
    
    weekly_stats = {
        'total_quizzes': sum(a.quizzes_completed for a in weekly_activities),
        'total_xp': sum(a.xp_earned for a in weekly_activities),
        'avg_daily_quizzes': sum(a.quizzes_completed for a in weekly_activities) / 7,
        'active_days': weekly_activities.count(),
        'daily_breakdown': [
            {
                'date': activity.date.isoformat(),
                'quizzes': activity.quizzes_completed,
                'xp': activity.xp_earned
            } for activity in weekly_activities
        ]
    }
    
    return Response({
        'achievement_overview': StudentAchievementSerializer(achievement).data,
        'badge_statistics': badge_stats,
        'weekly_activity': weekly_stats
    })