from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.authentication import TokenAuthentication
from django.db.models import Avg, Count, Q
from django.utils import timezone
from datetime import datetime, timedelta
import calendar

from .models import StudentEngagementMetrics, DailyEngagement
from .serializers import (
    StudentEngagementSerializer, StudentPerformanceDistributionSerializer,
    QuizAnalyticsSerializer, TopicAnalyticsSerializer, CourseAnalyticsSerializer,
    LecturerDashboardSerializer, StudentQuizPerformanceSerializer,
    StudentAnalyticsSerializer, EngagementHeatmapSerializer, BarChartDataSerializer,
    LecturerAnalyticsChoicesSerializer
)
from quizzes.models import Quiz, QuizAttempt
from courses.models import Course, Topic, CourseEnrollment
from users.models import User


class IsLecturerPermission(permissions.BasePermission):
    """Permission for lecturers only"""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_lecturer


class IsStudentPermission(permissions.BasePermission):
    """Permission for students only"""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_student


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def update_student_metrics(request):
    """Update metrics for all students in all courses (can be run by lecturers or system)"""
    if not (request.user.is_lecturer or request.user.is_staff):
        return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get courses based on user type
    if request.user.is_lecturer:
        courses = Course.objects.filter(lecturer=request.user, is_active=True)
    else:
        courses = Course.objects.filter(is_active=True)
    
    updated_count = 0
    
    for course in courses:
        # Get all enrolled students
        enrolled_students = CourseEnrollment.objects.filter(
            course=course, is_active=True
        ).values_list('student', flat=True)
        
        for student_id in enrolled_students:
            try:
                student = User.objects.get(id=student_id, user_type='student')
                metrics, created = StudentEngagementMetrics.objects.get_or_create(
                    student=student,
                    course=course
                )
                metrics.calculate_metrics()
                updated_count += 1
                
                # Update daily engagement if student took quiz today
                if metrics.last_quiz_date == timezone.now().date():
                    DailyEngagement.mark_engagement(student)
                    
            except User.DoesNotExist:
                continue
    
    return Response({
        'message': f'Updated metrics for {updated_count} student-course pairs',
        'courses_processed': courses.count()
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsLecturerPermission])
def lecturer_analytics_dashboard(request):
    """Main analytics dashboard for lecturers"""
    lecturer = request.user
    courses = Course.objects.filter(lecturer=lecturer, is_active=True)
    
    # Course overview data
    course_data = []
    for course in courses:
        attempts = QuizAttempt.objects.filter(
            quiz__topic__course=course,
            is_completed=True
        )
        
        enrolled_count = CourseEnrollment.objects.filter(
            course=course, is_active=True
        ).count()
        
        course_info = {
            'course_id': course.id,
            'course_code': course.code,
            'course_name': course.name,
            'total_students': enrolled_count,
            'total_quizzes': Quiz.objects.filter(topic__course=course, is_active=True).count(),
            'average_score': attempts.aggregate(avg=Avg('score_percentage'))['avg'] or 0,
            'total_attempts': attempts.count()
        }
        course_data.append(course_info)
    
    # Student performance distribution across all courses
    metrics = StudentEngagementMetrics.objects.filter(course__in=courses)
    distribution = metrics.values('performance_category').annotate(
        count=Count('performance_category')
    )
    
    total_students = metrics.count()
    distribution_data = []
    
    for item in distribution:
        percentage = (item['count'] / total_students * 100) if total_students > 0 else 0
        distribution_data.append({
            'performance_category': item['performance_category'],
            'count': item['count'],
            'percentage': round(percentage, 2)
        })
    
    # Recent performance trends (last 30 days)
    thirty_days_ago = timezone.now() - timedelta(days=30)
    recent_attempts = QuizAttempt.objects.filter(
        quiz__topic__course__in=courses,
        started_at__gte=thirty_days_ago,
        is_completed=True
    )
    
    recent_performance = {
        'total_recent_attempts': recent_attempts.count(),
        'recent_average_score': recent_attempts.aggregate(
            avg=Avg('score_percentage')
        )['avg'] or 0,
        'students_needing_attention': metrics.filter(
            performance_category='danger'
        ).count()
    }
    
    dashboard_data = {
        'course_overview': course_data,
        'student_distribution': distribution_data,
        'recent_performance': recent_performance
    }
    
    return Response(dashboard_data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsLecturerPermission])
def lecturer_analytics_chart(request):
    """Generate specific analytics charts for lecturers"""
    lecturer = request.user
    serializer = LecturerAnalyticsChoicesSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    chart_type = serializer.validated_data['chart_type']
    target_id = serializer.validated_data.get('target_id')
    
    chart_data = []
    
    if chart_type == 'quiz':
        # Quiz-specific analytics
        try:
            quiz = Quiz.objects.get(id=target_id, topic__course__lecturer=lecturer)
            attempts = QuizAttempt.objects.filter(quiz=quiz, is_completed=True)
            
            # Group by score ranges
            score_ranges = [
                ('0-30', 0, 30, '#ef4444'),
                ('30-50', 30, 50, '#f97316'), 
                ('50-70', 50, 70, '#eab308'),
                ('70-85', 70, 85, '#22c55e'),
                ('85-100', 85, 100, '#059669')
            ]
            
            for label, min_score, max_score, color in score_ranges:
                count = attempts.filter(
                    score_percentage__gte=min_score,
                    score_percentage__lt=max_score if max_score < 100 else 101
                ).count()
                
                chart_data.append({
                    'label': label,
                    'value': count,
                    'category': 'score_range',
                    'color': color
                })
                
        except Quiz.DoesNotExist:
            return Response({'error': 'Quiz not found'}, status=status.HTTP_404_NOT_FOUND)
    
    elif chart_type == 'topic':
        # Topic-specific analytics
        try:
            topic = Topic.objects.get(id=target_id, course__lecturer=lecturer)
            quizzes = Quiz.objects.filter(topic=topic, is_active=True)
            
            for quiz in quizzes:
                attempts = QuizAttempt.objects.filter(quiz=quiz, is_completed=True)
                avg_score = attempts.aggregate(avg=Avg('score_percentage'))['avg'] or 0
                
                chart_data.append({
                    'label': quiz.title[:20],  # Truncate long titles
                    'value': round(avg_score, 2),
                    'category': 'quiz_average',
                    'color': '#3b82f6'
                })
                
        except Topic.DoesNotExist:
            return Response({'error': 'Topic not found'}, status=status.HTTP_404_NOT_FOUND)
    
    elif chart_type == 'course':
        # Course-specific analytics
        try:
            course = Course.objects.get(id=target_id, lecturer=lecturer)
            topics = Topic.objects.filter(course=course)
            
            for topic in topics:
                topic_quizzes = Quiz.objects.filter(topic=topic, is_active=True)
                all_attempts = QuizAttempt.objects.filter(
                    quiz__in=topic_quizzes, is_completed=True
                )
                avg_score = all_attempts.aggregate(avg=Avg('score_percentage'))['avg'] or 0
                
                chart_data.append({
                    'label': topic.name[:20],
                    'value': round(avg_score, 2),
                    'category': 'topic_average',
                    'color': '#8b5cf6'
                })
                
        except Course.DoesNotExist:
            return Response({'error': 'Course not found'}, status=status.HTTP_404_NOT_FOUND)
    
    elif chart_type == 'student_distribution':
        # Student performance distribution
        courses = Course.objects.filter(lecturer=lecturer, is_active=True)
        metrics = StudentEngagementMetrics.objects.filter(course__in=courses)
        
        distribution = metrics.values('performance_category').annotate(
            count=Count('performance_category')
        )
        
        colors = {
            'danger': '#ef4444',
            'good': '#eab308', 
            'excellent': '#22c55e'
        }
        
        labels = {
            'danger': 'In Danger (<50%)',
            'good': 'Good (50-70%)',
            'excellent': 'Excellent (>70%)'
        }
        
        for item in distribution:
            category = item['performance_category']
            chart_data.append({
                'label': labels.get(category, category),
                'value': item['count'],
                'category': 'student_count',
                'color': colors.get(category, '#6b7280')
            })
    
    return Response({
        'chart_type': chart_type,
        'data': chart_data,
        'total_data_points': len(chart_data)
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsStudentPermission])
def student_analytics_dashboard(request):
    """Analytics dashboard for students"""
    student = request.user
    
    # Get all quiz attempts for this student
    all_attempts = QuizAttempt.objects.filter(
        student=student, is_completed=True
    ).order_by('-started_at')
    
    if not all_attempts.exists():
        return Response({
            'overall_average': 0,
            'total_quizzes_taken': 0,
            'performance_trend': [],
            'course_averages': {}
        })
    
    # Overall statistics
    total_quizzes = all_attempts.count()
    overall_average = all_attempts.aggregate(
        avg=Avg('score_percentage')
    )['avg'] or 0
    
    # Performance trend (last 10 attempts)
    recent_attempts = all_attempts[:10]
    performance_trend = []
    
    for attempt in reversed(recent_attempts):
        performance_trend.append({
            'quiz_title': attempt.quiz.title,
            'score': attempt.score_percentage,
            'date': attempt.started_at.strftime('%Y-%m-%d'),
            'course_code': attempt.quiz.topic.course.code
        })
    
    # Course averages
    course_averages = {}
    enrolled_courses = CourseEnrollment.objects.filter(
        student=student, is_active=True
    )
    
    for enrollment in enrolled_courses:
        course_attempts = all_attempts.filter(
            quiz__topic__course=enrollment.course
        )
        
        if course_attempts.exists():
            avg_score = course_attempts.aggregate(
                avg=Avg('score_percentage')
            )['avg']
            
            course_averages[enrollment.course.code] = {
                'average': round(avg_score, 2),
                'total_quizzes': course_attempts.count(),
                'course_name': enrollment.course.name
            }
    
    dashboard_data = {
        'overall_average': round(overall_average, 2),
        'total_quizzes_taken': total_quizzes,
        'performance_trend': performance_trend,
        'course_averages': course_averages
    }
    
    return Response(dashboard_data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsStudentPermission])
def student_engagement_heatmap(request):
    """Get engagement heatmap data for student"""
    student = request.user
    year = int(request.query_params.get('year', timezone.now().year))
    month = int(request.query_params.get('month', timezone.now().month))
    
    # Get engagement data for the specified month
    start_date = datetime(year, month, 1).date()
    if month == 12:
        end_date = datetime(year + 1, 1, 1).date() - timedelta(days=1)
    else:
        end_date = datetime(year, month + 1, 1).date() - timedelta(days=1)
    
    engagements = DailyEngagement.objects.filter(
        student=student,
        date__gte=start_date,
        date__lte=end_date
    )
    
    # Create engagement map
    engagement_map = {engagement.date.day: engagement.engaged for engagement in engagements}
    
    # Build calendar data
    cal = calendar.monthcalendar(year, month)
    engagement_data = []
    
    for week in cal:
        week_data = []
        for day in week:
            if day == 0:  # Empty day
                week_data.append(None)
            else:
                week_data.append({
                    'day': day,
                    'engaged': engagement_map.get(day, False),
                    'date': f"{year}-{month:02d}-{day:02d}"
                })
        engagement_data.append(week_data)
    
    return Response({
        'year': year,
        'month': month,
        'engagement_data': engagement_data,
        'month_name': calendar.month_name[month]
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsLecturerPermission])
def lecturer_course_options(request):
    """Get course and topic options for lecturer analytics"""
    lecturer = request.user
    courses = Course.objects.filter(lecturer=lecturer, is_active=True)
    
    course_options = []
    for course in courses:
        topics = Topic.objects.filter(course=course)
        topic_list = []
        
        for topic in topics:
            quizzes = Quiz.objects.filter(topic=topic, is_active=True)
            quiz_list = [{'id': quiz.id, 'title': quiz.title} for quiz in quizzes]
            
            topic_list.append({
                'id': topic.id,
                'name': topic.name,
                'quizzes': quiz_list
            })
        
        course_options.append({
            'id': course.id,
            'code': course.code,
            'name': course.name,
            'topics': topic_list
        })
    
    return Response({'courses': course_options})