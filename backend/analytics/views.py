from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Avg, Count, Max, Min, Sum, Q
from django.utils import timezone
from django.http import HttpResponse
from datetime import datetime, timedelta
import calendar
import csv

from .models import (
    StudentEngagementMetrics, DailyEngagement, LectureSlide, 
    AdaptiveQuiz, StudentAdaptiveProgress, AdaptiveQuizAttempt
)
from .serializers import (
    StudentEngagementSerializer, StudentPerformanceDistributionSerializer,
    QuizAnalyticsSerializer, TopicAnalyticsSerializer, CourseAnalyticsSerializer,
    LecturerDashboardSerializer, StudentQuizPerformanceSerializer,
    StudentAnalyticsSerializer, EngagementHeatmapSerializer, BarChartDataSerializer,
    LecturerAnalyticsChoicesSerializer
)
from quizzes.models import Quiz, QuizAttempt, Question, Choice
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


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsLecturerPermission])
def quiz_statistics(request, quiz_id):
    """Detailed statistics for a specific quiz"""
    try:
        quiz = Quiz.objects.get(id=quiz_id, topic__course__lecturer=request.user)
        attempts = QuizAttempt.objects.filter(quiz=quiz, is_completed=True)
        
        if not attempts.exists():
            return Response({
                'quiz_id': quiz.id,
                'quiz_title': quiz.title,
                'total_attempts': 0,
                'message': 'No completed attempts yet'
            })
        
        # Basic statistics
        scores = [attempt.score_percentage for attempt in attempts]
        
        # Question-level analysis
        questions = Question.objects.filter(quiz=quiz).order_by('order')
        question_stats = []
        
        for question in questions:
            if question.question_type == 'multiple_choice':
                # Analyze choice distribution
                choices = Choice.objects.filter(question=question)
                choice_stats = []
                
                for choice in choices:
                    choice_count = attempts.filter(
                        student_answers__selected_choice=choice
                    ).count()
                    
                    choice_stats.append({
                        'choice_text': choice.choice_text,
                        'is_correct': choice.is_correct,
                        'selection_count': choice_count,
                        'selection_percentage': (choice_count / len(attempts) * 100) if attempts else 0
                    })
                
                question_stats.append({
                    'question_id': question.id,
                    'question_text': question.question_text,
                    'question_type': question.question_type,
                    'choice_distribution': choice_stats
                })
        
        stats = {
            'quiz_id': quiz.id,
            'quiz_title': quiz.title,
            'total_attempts': attempts.count(),
            'unique_students': attempts.values('student').distinct().count(),
            'average_score': sum(scores) / len(scores),
            'highest_score': max(scores),
            'lowest_score': min(scores),
            'median_score': sorted(scores)[len(scores)//2],
            'score_distribution': {
                'excellent': len([s for s in scores if s >= 80]),
                'good': len([s for s in scores if 60 <= s < 80]),
                'average': len([s for s in scores if 40 <= s < 60]),
                'poor': len([s for s in scores if s < 40])
            },
            'question_analysis': question_stats,
            'completion_rate': (attempts.count() / quiz.topic.course.enrollments.filter(is_active=True).count() * 100) if quiz.topic.course.enrollments.filter(is_active=True).exists() else 0
        }
        
        return Response(stats)
        
    except Quiz.DoesNotExist:
        return Response({'error': 'Quiz not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsLecturerPermission])
def topic_statistics(request, topic_id):
    """Detailed statistics for a specific topic"""
    try:
        topic = Topic.objects.get(id=topic_id, course__lecturer=request.user)
        quizzes = Quiz.objects.filter(topic=topic, is_active=True)
        all_attempts = QuizAttempt.objects.filter(quiz__in=quizzes, is_completed=True)
        
        quiz_stats = []
        for quiz in quizzes:
            quiz_attempts = all_attempts.filter(quiz=quiz)
            if quiz_attempts.exists():
                scores = [attempt.score_percentage for attempt in quiz_attempts]
                quiz_stats.append({
                    'quiz_id': quiz.id,
                    'quiz_title': quiz.title,
                    'attempt_count': quiz_attempts.count(),
                    'average_score': sum(scores) / len(scores),
                    'completion_rate': (quiz_attempts.count() / topic.course.enrollments.filter(is_active=True).count() * 100) if topic.course.enrollments.filter(is_active=True).exists() else 0
                })
        
        # Adaptive learning stats
        adaptive_slides = LectureSlide.objects.filter(topic=topic, questions_generated=True)
        adaptive_stats = []
        
        for slide in adaptive_slides:
            slide_quizzes = AdaptiveQuiz.objects.filter(lecture_slide=slide, is_active=True)
            total_progress = StudentAdaptiveProgress.objects.filter(adaptive_quiz__in=slide_quizzes)
            completed_progress = total_progress.filter(completed=True)
            
            adaptive_stats.append({
                'slide_title': slide.title,
                'total_students_attempted': total_progress.values('student').distinct().count(),
                'completion_rate': (completed_progress.count() / total_progress.count() * 100) if total_progress.exists() else 0,
                'average_score': completed_progress.aggregate(avg=Avg('best_score'))['avg'] or 0
            })
        
        overall_stats = {
            'topic_id': topic.id,
            'topic_name': topic.name,
            'total_quizzes': quizzes.count(),
            'total_attempts': all_attempts.count(),
            'overall_average': all_attempts.aggregate(avg=Avg('score_percentage'))['avg'] or 0,
            'quiz_breakdown': quiz_stats,
            'adaptive_learning': adaptive_stats
        }
        
        return Response(overall_stats)
        
    except Topic.DoesNotExist:
        return Response({'error': 'Topic not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsLecturerPermission])
def course_statistics(request, course_id):
    """Detailed statistics for a specific course"""
    try:
        course = Course.objects.get(id=course_id, lecturer=request.user)
        topics = Topic.objects.filter(course=course)
        enrollments = course.enrollments.filter(is_active=True)
        
        # Traditional quiz statistics
        all_quizzes = Quiz.objects.filter(topic__in=topics, is_active=True)
        all_attempts = QuizAttempt.objects.filter(quiz__in=all_quizzes, is_completed=True)
        
        topic_breakdown = []
        for topic in topics:
            topic_quizzes = all_quizzes.filter(topic=topic)
            topic_attempts = all_attempts.filter(quiz__in=topic_quizzes)
            
            topic_breakdown.append({
                'topic_id': topic.id,
                'topic_name': topic.name,
                'quiz_count': topic_quizzes.count(),
                'attempt_count': topic_attempts.count(),
                'average_score': topic_attempts.aggregate(avg=Avg('score_percentage'))['avg'] or 0
            })
        
        # Student engagement analysis
        metrics = StudentEngagementMetrics.objects.filter(course=course)
        engagement_stats = {
            'total_enrolled': enrollments.count(),
            'students_with_attempts': all_attempts.values('student').distinct().count(),
            'engagement_rate': (all_attempts.values('student').distinct().count() / enrollments.count() * 100) if enrollments.exists() else 0,
            'performance_distribution': {
                'excellent': metrics.filter(performance_category='excellent').count(),
                'good': metrics.filter(performance_category='good').count(),
                'danger': metrics.filter(performance_category='danger').count()
            },
            'students_needing_attention': metrics.filter(consecutive_missed_quizzes__gte=3).count()
        }
        
        # Adaptive learning statistics
        adaptive_slides = LectureSlide.objects.filter(topic__in=topics, questions_generated=True)
        adaptive_quizzes = AdaptiveQuiz.objects.filter(lecture_slide__in=adaptive_slides, is_active=True)
        adaptive_progress = StudentAdaptiveProgress.objects.filter(adaptive_quiz__in=adaptive_quizzes)
        
        adaptive_stats = {
            'total_slides': adaptive_slides.count(),
            'total_adaptive_quizzes': adaptive_quizzes.count(),
            'students_using_adaptive': adaptive_progress.values('student').distinct().count(),
            'adaptive_completion_rate': (adaptive_progress.filter(completed=True).count() / adaptive_progress.count() * 100) if adaptive_progress.exists() else 0
        }
        
        course_stats = {
            'course_id': course.id,
            'course_code': course.code,
            'course_name': course.name,
            'total_quizzes': all_quizzes.count(),
            'total_attempts': all_attempts.count(),
            'overall_average': all_attempts.aggregate(avg=Avg('score_percentage'))['avg'] or 0,
            'topic_breakdown': topic_breakdown,
            'student_engagement': engagement_stats,
            'adaptive_learning': adaptive_stats,
            'last_updated': timezone.now()
        }
        
        return Response(course_stats)
        
    except Course.DoesNotExist:
        return Response({'error': 'Course not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsLecturerPermission])
def student_engagement_detail(request, student_id):
    """Detailed engagement statistics for a specific student"""
    try:
        student = User.objects.get(id=student_id, user_type='student')
        
        # Check if lecturer has access to this student
        student_courses = Course.objects.filter(
            enrollments__student=student,
            enrollments__is_active=True,
            lecturer=request.user
        )
        
        if not student_courses.exists():
            return Response({'error': 'Student not in your courses'}, status=status.HTTP_403_FORBIDDEN)
        
        engagement_data = []
        
        for course in student_courses:
            # Get metrics for this course
            try:
                metrics = StudentEngagementMetrics.objects.get(student=student, course=course)
                
                # Get recent activity
                recent_attempts = QuizAttempt.objects.filter(
                    student=student,
                    quiz__topic__course=course,
                    started_at__gte=timezone.now() - timedelta(days=30)
                ).order_by('-started_at')
                
                # Get adaptive learning progress
                adaptive_progress = StudentAdaptiveProgress.objects.filter(
                    student=student,
                    adaptive_quiz__lecture_slide__topic__course=course
                )
                
                course_engagement = {
                    'course_code': course.code,
                    'course_name': course.name,
                    'total_quizzes_taken': metrics.total_quizzes_taken,
                    'average_score': metrics.average_quiz_score,
                    'performance_category': metrics.performance_category,
                    'consecutive_missed': metrics.consecutive_missed_quizzes,
                    'last_quiz_date': metrics.last_quiz_date,
                    'recent_activity_count': recent_attempts.count(),
                    'adaptive_quizzes_completed': adaptive_progress.filter(completed=True).count(),
                    'adaptive_total_attempts': adaptive_progress.aggregate(total=Sum('attempts_count'))['total'] or 0
                }
                
                engagement_data.append(course_engagement)
                
            except StudentEngagementMetrics.DoesNotExist:
                engagement_data.append({
                    'course_code': course.code,
                    'course_name': course.name,
                    'total_quizzes_taken': 0,
                    'average_score': 0,
                    'performance_category': 'good',
                    'consecutive_missed': 0,
                    'last_quiz_date': None,
                    'recent_activity_count': 0,
                    'adaptive_quizzes_completed': 0,
                    'adaptive_total_attempts': 0
                })
        
        # Get engagement heatmap data for last 3 months
        three_months_ago = timezone.now() - timedelta(days=90)
        daily_engagements = DailyEngagement.objects.filter(
            student=student,
            date__gte=three_months_ago.date()
        ).order_by('date')
        
        engagement_summary = {
            'student_id': student.id,
            'student_name': student.get_full_name(),
            'student_number': student.student_number,
            'courses': engagement_data,
            'recent_engagement_days': daily_engagements.filter(engaged=True).count(),
            'total_tracked_days': daily_engagements.count(),
            'engagement_percentage': (daily_engagements.filter(engaged=True).count() / daily_engagements.count() * 100) if daily_engagements.exists() else 0
        }
        
        return Response(engagement_summary)
        
    except User.DoesNotExist:
        return Response({'error': 'Student not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def export_analytics_data(request):
    """Export analytics data in various formats"""
    export_type = request.query_params.get('type', 'course')  # course, quiz, student
    format_type = request.query_params.get('format', 'json')  # json, csv
    
    if request.user.is_lecturer:
        courses = Course.objects.filter(lecturer=request.user, is_active=True)
    else:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    if export_type == 'course':
        data = []
        for course in courses:
            enrollments = course.enrollments.filter(is_active=True)
            attempts = QuizAttempt.objects.filter(
                quiz__topic__course=course,
                is_completed=True
            )
            
            data.append({
                'course_code': course.code,
                'course_name': course.name,
                'total_students': enrollments.count(),
                'total_attempts': attempts.count(),
                'average_score': attempts.aggregate(avg=Avg('score_percentage'))['avg'] or 0,
                'active_quizzes': Quiz.objects.filter(topic__course=course, is_active=True).count()
            })
    
    elif export_type == 'student':
        data = []
        for course in courses:
            metrics = StudentEngagementMetrics.objects.filter(course=course)
            for metric in metrics:
                data.append({
                    'student_name': metric.student.get_full_name(),
                    'student_number': metric.student.student_number,
                    'course_code': course.code,
                    'total_quizzes': metric.total_quizzes_taken,
                    'average_score': metric.average_quiz_score,
                    'performance_category': metric.performance_category,
                    'consecutive_missed': metric.consecutive_missed_quizzes,
                    'last_quiz_date': metric.last_quiz_date
                })
    
    if format_type == 'csv':
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{export_type}_analytics.csv"'
        
        if data:
            writer = csv.DictWriter(response, fieldnames=data[0].keys())
            writer.writeheader()
            writer.writerows(data)
        
        return response
    
    else:  # JSON format
        return Response({
            'export_type': export_type,
            'export_date': timezone.now(),
            'data': data
        })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_live_quiz_stats(request, quiz_id):
    """Real-time statistics for active quizzes"""
    try:
        quiz = Quiz.objects.get(id=quiz_id)
        
        # Check permissions
        if request.user.is_lecturer and quiz.topic.course.lecturer != request.user:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        # Get current attempts (started but not completed)
        active_attempts = QuizAttempt.objects.filter(
            quiz=quiz,
            is_completed=False,
            started_at__gte=timezone.now() - timedelta(hours=2)  # Active in last 2 hours
        )
        
        completed_attempts = QuizAttempt.objects.filter(quiz=quiz, is_completed=True)
        
        live_stats = {
            'quiz_id': quiz.id,
            'quiz_title': quiz.title,
            'is_live': quiz.is_live,
            'active_participants': active_attempts.count(),
            'completed_today': completed_attempts.filter(
                completed_at__date=timezone.now().date()
            ).count(),
            'total_completed': completed_attempts.count(),
            'last_updated': timezone.now()
        }
        
        return Response(live_stats)
        
    except Quiz.DoesNotExist:
        return Response({'error': 'Quiz not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsLecturerPermission])
def get_engagement_trends(request):
    """Get engagement trends over time"""
    period = request.query_params.get('period', '30')  # days
    course_id = request.query_params.get('course_id')
    
    try:
        days = int(period)
    except ValueError:
        days = 30
    
    start_date = timezone.now() - timedelta(days=days)
    
    # Filter by course if specified
    courses = Course.objects.filter(lecturer=request.user, is_active=True)
    if course_id:
        courses = courses.filter(id=course_id)
    
    # Get daily engagement data
    daily_data = []
    for i in range(days):
        date = start_date + timedelta(days=i)
        
        # Count quiz attempts for that day
        day_attempts = QuizAttempt.objects.filter(
            quiz__topic__course__in=courses,
            started_at__date=date.date()
        ).count()
        
        # Count unique active students
        active_students = QuizAttempt.objects.filter(
            quiz__topic__course__in=courses,
            started_at__date=date.date()
        ).values('student').distinct().count()
        
        daily_data.append({
            'date': date.date().isoformat(),
            'total_attempts': day_attempts,
            'active_students': active_students
        })
    
    trend_data = {
        'period_days': days,
        'course_filter': course_id,
        'daily_engagement': daily_data,
        'summary': {
            'total_attempts': sum(d['total_attempts'] for d in daily_data),
            'average_daily_attempts': sum(d['total_attempts'] for d in daily_data) / days,
            'peak_day': max(daily_data, key=lambda x: x['total_attempts']) if daily_data else None
        }
    }
    
    return Response(trend_data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsLecturerPermission])
def get_performance_trends(request):
    """Get performance trends over time"""
    period = request.query_params.get('period', '30')
    course_id = request.query_params.get('course_id')
    
    try:
        days = int(period)
    except ValueError:
        days = 30
    
    start_date = timezone.now() - timedelta(days=days)
    
    courses = Course.objects.filter(lecturer=request.user, is_active=True)
    if course_id:
        courses = courses.filter(id=course_id)
    
    # Get weekly performance averages
    weekly_data = []
    weeks = days // 7 or 1
    
    for week in range(weeks):
        week_start = start_date + timedelta(weeks=week)
        week_end = week_start + timedelta(days=7)
        
        week_attempts = QuizAttempt.objects.filter(
            quiz__topic__course__in=courses,
            started_at__gte=week_start,
            started_at__lt=week_end,
            is_completed=True
        )
        
        if week_attempts.exists():
            avg_score = week_attempts.aggregate(avg=Avg('score_percentage'))['avg']
            weekly_data.append({
                'week_start': week_start.date().isoformat(),
                'week_end': week_end.date().isoformat(),
                'average_score': round(avg_score, 2),
                'total_attempts': week_attempts.count()
            })
    
    return Response({
        'period_days': days,
        'course_filter': course_id,
        'weekly_performance': weekly_data,
        'overall_trend': {
            'total_weeks': len(weekly_data),
            'overall_average': sum(w['average_score'] for w in weekly_data) / len(weekly_data) if weekly_data else 0
        }
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsLecturerPermission])
def compare_quizzes(request):
    """Compare multiple quizzes"""
    quiz_ids = request.data.get('quiz_ids', [])
    
    if not quiz_ids:
        return Response({'error': 'quiz_ids required'}, status=status.HTTP_400_BAD_REQUEST)
    
    comparison_data = []
    
    for quiz_id in quiz_ids:
        try:
            quiz = Quiz.objects.get(id=quiz_id, topic__course__lecturer=request.user)
            attempts = QuizAttempt.objects.filter(quiz=quiz, is_completed=True)
            
            if attempts.exists():
                scores = [attempt.score_percentage for attempt in attempts]
                comparison_data.append({
                    'quiz_id': quiz.id,
                    'quiz_title': quiz.title,
                    'course_code': quiz.topic.course.code,
                    'total_attempts': attempts.count(),
                    'average_score': sum(scores) / len(scores),
                    'highest_score': max(scores),
                    'lowest_score': min(scores)
                })
        except Quiz.DoesNotExist:
            continue
    
    return Response({
        'comparison_type': 'quizzes',
        'compared_items': len(comparison_data),
        'data': comparison_data
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsLecturerPermission])
def compare_topics(request):
    """Compare multiple topics"""
    topic_ids = request.data.get('topic_ids', [])
    
    if not topic_ids:
        return Response({'error': 'topic_ids required'}, status=status.HTTP_400_BAD_REQUEST)
    
    comparison_data = []
    
    for topic_id in topic_ids:
        try:
            topic = Topic.objects.get(id=topic_id, course__lecturer=request.user)
            quizzes = Quiz.objects.filter(topic=topic, is_active=True)
            attempts = QuizAttempt.objects.filter(quiz__in=quizzes, is_completed=True)
            
            comparison_data.append({
                'topic_id': topic.id,
                'topic_name': topic.name,
                'course_code': topic.course.code,
                'total_quizzes': quizzes.count(),
                'total_attempts': attempts.count(),
                'average_score': attempts.aggregate(avg=Avg('score_percentage'))['avg'] or 0,
                'unique_students': attempts.values('student').distinct().count()
            })
        except Topic.DoesNotExist:
            continue
    
    return Response({
        'comparison_type': 'topics',
        'compared_items': len(comparison_data),
        'data': comparison_data
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsLecturerPermission])
def compare_courses(request):
    """Compare multiple courses"""
    course_ids = request.data.get('course_ids', [])
    
    if not course_ids:
        return Response({'error': 'course_ids required'}, status=status.HTTP_400_BAD_REQUEST)
    
    comparison_data = []
    
    for course_id in course_ids:
        try:
            course = Course.objects.get(id=course_id, lecturer=request.user)
            enrollments = course.enrollments.filter(is_active=True)
            quizzes = Quiz.objects.filter(topic__course=course, is_active=True)
            attempts = QuizAttempt.objects.filter(quiz__in=quizzes, is_completed=True)
            
            comparison_data.append({
                'course_id': course.id,
                'course_code': course.code,
                'course_name': course.name,
                'total_students': enrollments.count(),
                'total_quizzes': quizzes.count(),
                'total_attempts': attempts.count(),
                'average_score': attempts.aggregate(avg=Avg('score_percentage'))['avg'] or 0,
                'engagement_rate': (attempts.values('student').distinct().count() / enrollments.count() * 100) if enrollments.exists() else 0
            })
        except Course.DoesNotExist:
            continue
    
    return Response({
        'comparison_type': 'courses',
        'compared_items': len(comparison_data),
        'data': comparison_data
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def adaptive_slide_statistics(request, slide_id):
    """Statistics for adaptive learning slide"""
    try:
        slide = LectureSlide.objects.get(id=slide_id)
        
        # Check permissions
        if request.user.is_lecturer and slide.uploaded_by != request.user:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        quizzes = AdaptiveQuiz.objects.filter(lecture_slide=slide, is_active=True)
        all_progress = StudentAdaptiveProgress.objects.filter(adaptive_quiz__in=quizzes)
        
        difficulty_stats = []
        for difficulty in ['easy', 'medium', 'hard']:
            difficulty_quiz = quizzes.filter(difficulty=difficulty).first()
            if difficulty_quiz:
                progress = all_progress.filter(adaptive_quiz=difficulty_quiz)
                
                difficulty_stats.append({
                    'difficulty': difficulty,
                    'total_attempts': progress.aggregate(total=Sum('attempts_count'))['total'] or 0,
                    'students_attempted': progress.count(),
                    'students_completed': progress.filter(completed=True).count(),
                    'average_score': progress.filter(completed=True).aggregate(avg=Avg('best_score'))['avg'] or 0,
                    'completion_rate': (progress.filter(completed=True).count() / progress.count() * 100) if progress.exists() else 0
                })
        
        slide_stats = {
            'slide_id': slide.id,
            'slide_title': slide.title,
            'course_code': slide.topic.course.code,
            'topic_name': slide.topic.name,
            'total_students': all_progress.values('student').distinct().count(),
            'overall_completion_rate': (all_progress.filter(completed=True).count() / all_progress.count() * 100) if all_progress.exists() else 0,
            'difficulty_breakdown': difficulty_stats
        }
        
        return Response(slide_stats)
        
    except LectureSlide.DoesNotExist:
        return Response({'error': 'Slide not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_progress_analytics(request):
    """Get adaptive learning progress analytics"""
    student_id = request.query_params.get('student_id')
    course_id = request.query_params.get('course_id')
    
    if request.user.is_lecturer:
        # Lecturer can view all students in their courses
        courses = Course.objects.filter(lecturer=request.user, is_active=True)
        if course_id:
            courses = courses.filter(id=course_id)
        
        progress_query = StudentAdaptiveProgress.objects.filter(
            adaptive_quiz__lecture_slide__topic__course__in=courses
        )
        
        if student_id:
            progress_query = progress_query.filter(student_id=student_id)
    
    elif request.user.is_student:
        # Students can only view their own progress
        progress_query = StudentAdaptiveProgress.objects.filter(student=request.user)
        
        if course_id:
            progress_query = progress_query.filter(
                adaptive_quiz__lecture_slide__topic__course_id=course_id
            )
    
    else:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    # Aggregate progress data
    progress_data = []
    
    for progress in progress_query.select_related(
        'student', 'adaptive_quiz__lecture_slide__topic__course'
    ):
        progress_info = {
            'student_name': progress.student.get_full_name(),
            'student_number': progress.student.student_number,
            'course_code': progress.adaptive_quiz.lecture_slide.topic.course.code,
            'slide_title': progress.adaptive_quiz.lecture_slide.title,
            'difficulty': progress.adaptive_quiz.difficulty,
            'attempts_count': progress.attempts_count,
            'best_score': progress.best_score,
            'completed': progress.completed,
            'last_attempt': progress.last_attempt_at
        }
        progress_data.append(progress_info)
    
    # Summary statistics
    summary = {
        'total_progress_records': len(progress_data),
        'completed_quizzes': len([p for p in progress_data if p['completed']]),
        'average_score': sum(p['best_score'] for p in progress_data) / len(progress_data) if progress_data else 0,
        'total_attempts': sum(p['attempts_count'] for p in progress_data)
    }
    
    return Response({
        'summary': summary,
        'progress_details': progress_data
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsLecturerPermission])
def export_quiz_results(request, quiz_id):
    """Export quiz results"""
    format_type = request.query_params.get('format', 'json')
    
    try:
        quiz = Quiz.objects.get(id=quiz_id, topic__course__lecturer=request.user)
        attempts = QuizAttempt.objects.filter(quiz=quiz, is_completed=True)
        
        data = []
        for attempt in attempts:
            data.append({
                'student_name': attempt.student.get_full_name(),
                'student_number': attempt.student.student_number,
                'score_percentage': attempt.score_percentage,
                'started_at': attempt.started_at,
                'completed_at': attempt.completed_at,
                'time_taken': str(attempt.time_taken) if attempt.time_taken else None
            })
        
        if format_type == 'csv':
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="quiz_{quiz_id}_results.csv"'
            
            if data:
                writer = csv.DictWriter(response, fieldnames=data[0].keys())
                writer.writeheader()
                writer.writerows(data)
            
            return response
        
        else:  # JSON format
            return Response({
                'quiz_id': quiz.id,
                'quiz_title': quiz.title,
                'export_date': timezone.now(),
                'results': data
            })
            
    except Quiz.DoesNotExist:
        return Response({'error': 'Quiz not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsLecturerPermission])
def export_course_data(request, course_id):
    """Export comprehensive course data"""
    format_type = request.query_params.get('format', 'json')
    
    try:
        course = Course.objects.get(id=course_id, lecturer=request.user)
        
        # Get all quiz attempts for this course
        attempts = QuizAttempt.objects.filter(
            quiz__topic__course=course,
            is_completed=True
        )
        
        data = []
        for attempt in attempts:
            data.append({
                'student_name': attempt.student.get_full_name(),
                'student_number': attempt.student.student_number,
                'topic_name': attempt.quiz.topic.name,
                'quiz_title': attempt.quiz.title,
                'score_percentage': attempt.score_percentage,
                'completed_at': attempt.completed_at
            })
        
        if format_type == 'csv':
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="course_{course.code}_data.csv"'
            
            if data:
                writer = csv.DictWriter(response, fieldnames=data[0].keys())
                writer.writeheader()
                writer.writerows(data)
            
            return response
        
        else:  # JSON format
            return Response({
                'course_id': course.id,
                'course_code': course.code,
                'course_name': course.name,
                'export_date': timezone.now(),
                'results': data
            })
            
    except Course.DoesNotExist:
        return Response({'error': 'Course not found'}, status=status.HTTP_404_NOT_FOUND)