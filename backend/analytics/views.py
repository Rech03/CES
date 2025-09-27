from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Avg, Count, Max, Min, Sum, Q
from django.utils import timezone
from django.http import HttpResponse
from datetime import datetime, timedelta
import calendar
import csv
from django.http import HttpResponse

from .models import StudentEngagementMetrics, DailyEngagement
from .serializers import (
    StudentEngagementSerializer, StudentPerformanceDistributionSerializer,
    QuizAnalyticsSerializer, TopicAnalyticsSerializer, CourseAnalyticsSerializer,
    LecturerDashboardSerializer, StudentQuizPerformanceSerializer,
    StudentAnalyticsSerializer, EngagementHeatmapSerializer, BarChartDataSerializer,
    LecturerAnalyticsChoicesSerializer
)
from courses.models import Course, Topic, CourseEnrollment
from users.models import User
from ai_quiz.models import AdaptiveQuizAttempt, AdaptiveQuiz, LectureSlide


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
                
                # Update daily engagement if student took AI quiz today
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
    """Main analytics dashboard for lecturers - AI quiz focused"""
    lecturer = request.user
    courses = Course.objects.filter(lecturer=lecturer, is_active=True)
    
    # Course overview data based on AI quizzes
    course_data = []
    for course in courses:
        # Get AI quiz attempts for this course
        ai_attempts = AdaptiveQuizAttempt.objects.filter(
            progress__adaptive_quiz__lecture_slide__topic__course=course
        )
        
        enrolled_count = CourseEnrollment.objects.filter(
            course=course, is_active=True
        ).count()
        
        course_info = {
            'course_id': course.id,
            'course_code': course.code,
            'course_name': course.name,
            'total_students': enrolled_count,
            'total_ai_quizzes': ai_attempts.count(),
            'average_score': ai_attempts.aggregate(avg=Avg('score_percentage'))['avg'] or 0,
            'total_attempts': ai_attempts.count(),
            'unique_participants': ai_attempts.values('progress__student').distinct().count()
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
    
    # Recent performance trends (last 30 days) - AI quiz data
    thirty_days_ago = timezone.now() - timedelta(days=30)
    recent_attempts = AdaptiveQuizAttempt.objects.filter(
        progress__adaptive_quiz__lecture_slide__topic__course__in=courses,
        started_at__gte=thirty_days_ago
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
    """Generate specific analytics charts for lecturers - AI quiz focused"""
    lecturer = request.user
    serializer = LecturerAnalyticsChoicesSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    chart_type = serializer.validated_data['chart_type']
    target_id = serializer.validated_data.get('target_id')
    
    chart_data = []
    
    if chart_type == 'quiz':
        # AI Quiz-specific analytics
        try:
            adaptive_quiz = AdaptiveQuiz.objects.get(
                id=target_id, 
                lecture_slide__topic__course__lecturer=lecturer
            )
            attempts = AdaptiveQuizAttempt.objects.filter(
                progress__adaptive_quiz=adaptive_quiz
            )
            
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
                
        except AdaptiveQuiz.DoesNotExist:
            return Response({'error': 'AI Quiz not found'}, status=status.HTTP_404_NOT_FOUND)
    
    elif chart_type == 'topic':
        # Topic-specific analytics based on AI quizzes
        try:
            topic = Topic.objects.get(id=target_id, course__lecturer=lecturer)
            adaptive_quizzes = AdaptiveQuiz.objects.filter(
                lecture_slide__topic=topic, is_active=True
            )
            
            for adaptive_quiz in adaptive_quizzes:
                attempts = AdaptiveQuizAttempt.objects.filter(
                    progress__adaptive_quiz=adaptive_quiz
                )
                avg_score = attempts.aggregate(avg=Avg('score_percentage'))['avg'] or 0
                
                chart_data.append({
                    'label': f"{adaptive_quiz.lecture_slide.title} ({adaptive_quiz.difficulty})",
                    'value': round(avg_score, 2),
                    'category': 'quiz_average',
                    'color': '#3b82f6'
                })
                
        except Topic.DoesNotExist:
            return Response({'error': 'Topic not found'}, status=status.HTTP_404_NOT_FOUND)
    
    elif chart_type == 'course':
        # Course-specific analytics based on AI quizzes
        try:
            course = Course.objects.get(id=target_id, lecturer=lecturer)
            topics = Topic.objects.filter(course=course)
            
            for topic in topics:
                topic_attempts = AdaptiveQuizAttempt.objects.filter(
                    progress__adaptive_quiz__lecture_slide__topic=topic
                )
                avg_score = topic_attempts.aggregate(avg=Avg('score_percentage'))['avg'] or 0
                
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
    """Analytics dashboard for students - AI quiz focused"""
    student = request.user
    
    # Get all AI quiz attempts for this student
    all_attempts = AdaptiveQuizAttempt.objects.filter(
        progress__student=student
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
            'quiz_title': attempt.progress.adaptive_quiz.lecture_slide.title,
            'difficulty': attempt.progress.adaptive_quiz.difficulty,
            'score': attempt.score_percentage,
            'date': attempt.started_at.strftime('%Y-%m-%d'),
            'course_code': attempt.progress.adaptive_quiz.lecture_slide.topic.course.code
        })
    
    # Course averages based on AI quiz attempts
    course_averages = {}
    enrolled_courses = CourseEnrollment.objects.filter(
        student=student, is_active=True
    )
    
    for enrollment in enrolled_courses:
        course_attempts = all_attempts.filter(
            progress__adaptive_quiz__lecture_slide__topic__course=enrollment.course
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
            # Get AI quizzes instead of traditional quizzes
            adaptive_quizzes = AdaptiveQuiz.objects.filter(
                lecture_slide__topic=topic, is_active=True
            )
            quiz_list = [{
                'id': quiz.id, 
                'title': f"{quiz.lecture_slide.title} ({quiz.difficulty})"
            } for quiz in adaptive_quizzes]
            
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
    """Detailed statistics for a specific AI quiz"""
    try:
        adaptive_quiz = AdaptiveQuiz.objects.get(
            id=quiz_id, 
            lecture_slide__topic__course__lecturer=request.user
        )
        attempts = AdaptiveQuizAttempt.objects.filter(
            progress__adaptive_quiz=adaptive_quiz
        )
        
        if not attempts.exists():
            return Response({
                'quiz_id': adaptive_quiz.id,
                'quiz_title': adaptive_quiz.lecture_slide.title,
                'difficulty': adaptive_quiz.difficulty,
                'total_attempts': 0,
                'message': 'No completed attempts yet'
            })
        
        # Basic statistics
        scores = [attempt.score_percentage for attempt in attempts]
        
        # Question-level analysis for AI quizzes
        questions_data = adaptive_quiz.get_questions().get('questions', [])
        question_stats = []
        
        for i, question in enumerate(questions_data):
            # Analyze answer distribution for this question
            question_answers = []
            for attempt in attempts:
                answers = attempt.answers_data if attempt.answers_data else {}
                question_key = f"question_{i}"
                if question_key in answers:
                    question_answers.append(answers[question_key])
            
            # Count choice selections
            choice_stats = []
            options = question.get('options', {})
            for choice_key in ['A', 'B', 'C', 'D']:
                if choice_key in options:
                    selection_count = question_answers.count(choice_key)
                    choice_stats.append({
                        'choice_key': choice_key,
                        'choice_text': options[choice_key],
                        'is_correct': choice_key == question.get('correct_answer'),
                        'selection_count': selection_count,
                        'selection_percentage': (selection_count / len(attempts) * 100) if attempts else 0
                    })
            
            question_stats.append({
                'question_number': i,
                'question_text': question.get('question'),
                'difficulty': question.get('difficulty'),
                'choice_distribution': choice_stats
            })
        
        stats = {
            'quiz_id': adaptive_quiz.id,
            'quiz_title': adaptive_quiz.lecture_slide.title,
            'difficulty': adaptive_quiz.difficulty,
            'total_attempts': attempts.count(),
            'unique_students': attempts.values('progress__student').distinct().count(),
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
            'completion_rate': (attempts.count() / adaptive_quiz.lecture_slide.topic.course.enrollments.filter(is_active=True).count() * 100) if adaptive_quiz.lecture_slide.topic.course.enrollments.filter(is_active=True).exists() else 0
        }
        
        return Response(stats)
        
    except AdaptiveQuiz.DoesNotExist:
        return Response({'error': 'AI Quiz not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsLecturerPermission])
def topic_statistics(request, topic_id):
    """Detailed statistics for a specific topic - AI quiz focused"""
    try:
        topic = Topic.objects.get(id=topic_id, course__lecturer=request.user)
        adaptive_quizzes = AdaptiveQuiz.objects.filter(
            lecture_slide__topic=topic, is_active=True
        )
        all_attempts = AdaptiveQuizAttempt.objects.filter(
            progress__adaptive_quiz__in=adaptive_quizzes
        )
        
        quiz_stats = []
        for adaptive_quiz in adaptive_quizzes:
            quiz_attempts = all_attempts.filter(progress__adaptive_quiz=adaptive_quiz)
            if quiz_attempts.exists():
                scores = [attempt.score_percentage for attempt in quiz_attempts]
                quiz_stats.append({
                    'quiz_id': adaptive_quiz.id,
                    'quiz_title': adaptive_quiz.lecture_slide.title,
                    'difficulty': adaptive_quiz.difficulty,
                    'attempt_count': quiz_attempts.count(),
                    'average_score': sum(scores) / len(scores),
                    'completion_rate': (quiz_attempts.count() / topic.course.enrollments.filter(is_active=True).count() * 100) if topic.course.enrollments.filter(is_active=True).exists() else 0
                })
        
        overall_stats = {
            'topic_id': topic.id,
            'topic_name': topic.name,
            'total_ai_quizzes': adaptive_quizzes.count(),
            'total_attempts': all_attempts.count(),
            'overall_average': all_attempts.aggregate(avg=Avg('score_percentage'))['avg'] or 0,
            'quiz_breakdown': quiz_stats
        }
        
        return Response(overall_stats)
        
    except Topic.DoesNotExist:
        return Response({'error': 'Topic not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsLecturerPermission])
def course_statistics(request, course_id):
    """Detailed statistics for a specific course - AI quiz focused"""
    try:
        course = Course.objects.get(id=course_id, lecturer=request.user)
        topics = Topic.objects.filter(course=course)
        enrollments = course.enrollments.filter(is_active=True)
        
        # AI quiz statistics
        all_adaptive_quizzes = AdaptiveQuiz.objects.filter(
            lecture_slide__topic__in=topics, is_active=True
        )
        all_attempts = AdaptiveQuizAttempt.objects.filter(
            progress__adaptive_quiz__in=all_adaptive_quizzes
        )
        
        topic_breakdown = []
        for topic in topics:
            topic_attempts = all_attempts.filter(
                progress__adaptive_quiz__lecture_slide__topic=topic
            )
            
            topic_breakdown.append({
                'topic_id': topic.id,
                'topic_name': topic.name,
                'ai_quiz_count': all_adaptive_quizzes.filter(lecture_slide__topic=topic).count(),
                'attempt_count': topic_attempts.count(),
                'average_score': topic_attempts.aggregate(avg=Avg('score_percentage'))['avg'] or 0
            })
        
        # Student engagement analysis
        metrics = StudentEngagementMetrics.objects.filter(course=course)
        engagement_stats = {
            'total_enrolled': enrollments.count(),
            'students_with_attempts': all_attempts.values('progress__student').distinct().count(),
            'engagement_rate': (all_attempts.values('progress__student').distinct().count() / enrollments.count() * 100) if enrollments.exists() else 0,
            'performance_distribution': {
                'excellent': metrics.filter(performance_category='excellent').count(),
                'good': metrics.filter(performance_category='good').count(),
                'danger': metrics.filter(performance_category='danger').count()
            },
            'students_needing_attention': metrics.filter(consecutive_missed_quizzes__gte=3).count()
        }
        
        course_stats = {
            'course_id': course.id,
            'course_code': course.code,
            'course_name': course.name,
            'total_ai_quizzes': all_adaptive_quizzes.count(),
            'total_attempts': all_attempts.count(),
            'overall_average': all_attempts.aggregate(avg=Avg('score_percentage'))['avg'] or 0,
            'topic_breakdown': topic_breakdown,
            'student_engagement': engagement_stats,
            'last_updated': timezone.now()
        }
        
        return Response(course_stats)
        
    except Course.DoesNotExist:
        return Response({'error': 'Course not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsLecturerPermission])
def student_engagement_detail(request, student_id):
    """Detailed engagement statistics for a specific student - AI quiz focused"""
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
                
                # Get recent AI quiz activity
                recent_attempts = AdaptiveQuizAttempt.objects.filter(
                    progress__student=student,
                    progress__adaptive_quiz__lecture_slide__topic__course=course,
                    started_at__gte=timezone.now() - timedelta(days=30)
                ).order_by('-started_at')
                
                course_engagement = {
                    'course_code': course.code,
                    'course_name': course.name,
                    'total_quizzes_taken': metrics.total_quizzes_taken,
                    'average_score': metrics.average_quiz_score,
                    'performance_category': metrics.performance_category,
                    'consecutive_missed': metrics.consecutive_missed_quizzes,
                    'last_quiz_date': metrics.last_quiz_date,
                    'recent_activity_count': recent_attempts.count()
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
                    'recent_activity_count': 0
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
    """Export analytics data in various formats - AI quiz focused"""
    try:
        print(f"DEBUG: Export called with params: {request.query_params}")
        print(f"DEBUG: User: {request.user}")
        
        export_type = request.query_params.get('type', 'course')
        format_type = request.query_params.get('format', 'json')
        
        print(f"DEBUG: export_type={export_type}, format_type={format_type}")
        
        if request.user.is_lecturer:
            courses = Course.objects.filter(lecturer=request.user, is_active=True)
            print(f"DEBUG: Found {courses.count()} courses")
        else:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        data = []
        
        if export_type == 'course':
            for course in courses:
                enrollments = course.enrollments.filter(is_active=True)
                attempts = AdaptiveQuizAttempt.objects.filter(
                    progress__adaptive_quiz__lecture_slide__topic__course=course
                )
                
                data.append({
                    'course_code': course.code,
                    'course_name': course.name,
                    'total_students': enrollments.count(),
                    'total_attempts': attempts.count(),
                    'average_score': attempts.aggregate(avg=Avg('score_percentage'))['avg'] or 0,
                    'active_ai_quizzes': AdaptiveQuiz.objects.filter(
                        lecture_slide__topic__course=course, is_active=True
                    ).count()
                })
        
        print(f"DEBUG: Data length: {len(data)}")
        
        if format_type == 'csv':
            print("DEBUG: Creating CSV response")
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="{export_type}_analytics.csv"'
            
            if data and len(data) > 0:
                print("DEBUG: Writing data to CSV")
                writer = csv.DictWriter(response, fieldnames=data[0].keys())
                writer.writeheader()
                writer.writerows(data)
            else:
                print("DEBUG: Writing empty CSV with headers")
                fieldnames = ['course_code', 'course_name', 'total_students', 'total_attempts', 'average_score', 'active_ai_quizzes']
                writer = csv.DictWriter(response, fieldnames=fieldnames)
                writer.writeheader()
            
            print("DEBUG: Returning CSV response")
            return response
        
        else:  # JSON format
            print("DEBUG: Returning JSON response")
            return Response({
                'export_type': export_type,
                'export_date': timezone.now(),
                'data': data
            })
            
    except Exception as e:
        print(f"DEBUG: Exception occurred: {e}")
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_live_quiz_stats(request, quiz_id):
    """Real-time statistics for active AI quizzes"""
    try:
        adaptive_quiz = AdaptiveQuiz.objects.get(id=quiz_id)
        
        # Check permissions
        if request.user.is_lecturer and adaptive_quiz.lecture_slide.topic.course.lecturer != request.user:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        # Get current attempts (started but not completed in last 2 hours)
        active_attempts = AdaptiveQuizAttempt.objects.filter(
            progress__adaptive_quiz=adaptive_quiz,
            started_at__gte=timezone.now() - timedelta(hours=2)
        )
        
        completed_attempts = AdaptiveQuizAttempt.objects.filter(
            progress__adaptive_quiz=adaptive_quiz
        )
        
        live_stats = {
            'quiz_id': adaptive_quiz.id,
            'quiz_title': adaptive_quiz.lecture_slide.title,
            'difficulty': adaptive_quiz.difficulty,
            'active_participants': active_attempts.count(),
            'completed_today': completed_attempts.filter(
                completed_at__date=timezone.now().date()
            ).count(),
            'total_completed': completed_attempts.count(),
            'last_updated': timezone.now()
        }
        
        return Response(live_stats)
        
    except AdaptiveQuiz.DoesNotExist:
        return Response({'error': 'AI Quiz not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsLecturerPermission])
def get_engagement_trends(request):
    """Get engagement trends over time - AI quiz focused"""
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
    
    # Get daily engagement data based on AI quiz attempts
    daily_data = []
    for i in range(days):
        date = start_date + timedelta(days=i)
        
        # Count AI quiz attempts for that day
        day_attempts = AdaptiveQuizAttempt.objects.filter(
            progress__adaptive_quiz__lecture_slide__topic__course__in=courses,
            started_at__date=date.date()
        ).count()
        
        # Count unique active students
        active_students = AdaptiveQuizAttempt.objects.filter(
            progress__adaptive_quiz__lecture_slide__topic__course__in=courses,
            started_at__date=date.date()
        ).values('progress__student').distinct().count()
        
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
    """Get performance trends over time - AI quiz focused"""
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
    
    # Get weekly performance averages from AI quizzes
    weekly_data = []
    weeks = days // 7 or 1
    
    for week in range(weeks):
        week_start = start_date + timedelta(weeks=week)
        week_end = week_start + timedelta(days=7)
        
        week_attempts = AdaptiveQuizAttempt.objects.filter(
            progress__adaptive_quiz__lecture_slide__topic__course__in=courses,
            started_at__gte=week_start,
            started_at__lt=week_end
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
    """Compare multiple AI quizzes"""
    quiz_ids = request.data.get('quiz_ids', [])
    
    if not quiz_ids:
        return Response({'error': 'quiz_ids required'}, status=status.HTTP_400_BAD_REQUEST)
    
    comparison_data = []
    
    for quiz_id in quiz_ids:
        try:
            adaptive_quiz = AdaptiveQuiz.objects.get(
                id=quiz_id, 
                lecture_slide__topic__course__lecturer=request.user
            )
            attempts = AdaptiveQuizAttempt.objects.filter(
                progress__adaptive_quiz=adaptive_quiz
            )
            
            if attempts.exists():
                scores = [attempt.score_percentage for attempt in attempts]
                comparison_data.append({
                    'quiz_id': adaptive_quiz.id,
                    'quiz_title': adaptive_quiz.lecture_slide.title,
                    'difficulty': adaptive_quiz.difficulty,
                    'course_code': adaptive_quiz.lecture_slide.topic.course.code,
                    'total_attempts': attempts.count(),
                    'average_score': sum(scores) / len(scores),
                    'highest_score': max(scores),
                    'lowest_score': min(scores)
                })
        except AdaptiveQuiz.DoesNotExist:
            continue
    
    return Response({
        'comparison_type': 'ai_quizzes',
        'compared_items': len(comparison_data),
        'data': comparison_data
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsLecturerPermission])
def compare_topics(request):
    """Compare multiple topics - AI quiz focused"""
    topic_ids = request.data.get('topic_ids', [])
    
    if not topic_ids:
        return Response({'error': 'topic_ids required'}, status=status.HTTP_400_BAD_REQUEST)
    
    comparison_data = []
    
    for topic_id in topic_ids:
        try:
            topic = Topic.objects.get(id=topic_id, course__lecturer=request.user)
            adaptive_quizzes = AdaptiveQuiz.objects.filter(
                lecture_slide__topic=topic, is_active=True
            )
            attempts = AdaptiveQuizAttempt.objects.filter(
                progress__adaptive_quiz__in=adaptive_quizzes
            )
            
            comparison_data.append({
                'topic_id': topic.id,
                'topic_name': topic.name,
                'course_code': topic.course.code,
                'total_ai_quizzes': adaptive_quizzes.count(),
                'total_attempts': attempts.count(),
                'average_score': attempts.aggregate(avg=Avg('score_percentage'))['avg'] or 0,
                'unique_students': attempts.values('progress__student').distinct().count()
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
    """Compare multiple courses - AI quiz focused"""
    course_ids = request.data.get('course_ids', [])
    
    if not course_ids:
        return Response({'error': 'course_ids required'}, status=status.HTTP_400_BAD_REQUEST)
    
    comparison_data = []
    
    for course_id in course_ids:
        try:
            course = Course.objects.get(id=course_id, lecturer=request.user)
            enrollments = course.enrollments.filter(is_active=True)
            adaptive_quizzes = AdaptiveQuiz.objects.filter(
                lecture_slide__topic__course=course, is_active=True
            )
            attempts = AdaptiveQuizAttempt.objects.filter(
                progress__adaptive_quiz__in=adaptive_quizzes
            )
            
            comparison_data.append({
                'course_id': course.id,
                'course_code': course.code,
                'course_name': course.name,
                'total_students': enrollments.count(),
                'total_ai_quizzes': adaptive_quizzes.count(),
                'total_attempts': attempts.count(),
                'average_score': attempts.aggregate(avg=Avg('score_percentage'))['avg'] or 0,
                'engagement_rate': (attempts.values('progress__student').distinct().count() / enrollments.count() * 100) if enrollments.exists() else 0
            })
        except Course.DoesNotExist:
            continue
    
    return Response({
        'comparison_type': 'courses',
        'compared_items': len(comparison_data),
        'data': comparison_data
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsLecturerPermission])
def export_quiz_results(request, quiz_id):
    """Export AI quiz results"""
    format_type = request.query_params.get('format', 'json')
    
    try:
        adaptive_quiz = AdaptiveQuiz.objects.get(
            id=quiz_id, 
            lecture_slide__topic__course__lecturer=request.user
        )
        attempts = AdaptiveQuizAttempt.objects.filter(
            progress__adaptive_quiz=adaptive_quiz
        )
        
        data = []
        for attempt in attempts:
            duration = None
            if attempt.completed_at and attempt.started_at:
                duration = attempt.completed_at - attempt.started_at
            
            data.append({
                'student_name': attempt.progress.student.get_full_name(),
                'student_number': attempt.progress.student.student_number,
                'score_percentage': attempt.score_percentage,
                'difficulty': adaptive_quiz.difficulty,
                'started_at': attempt.started_at,
                'completed_at': attempt.completed_at,
                'time_taken': str(duration) if duration else None
            })
        
        if format_type == 'csv':
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="ai_quiz_{quiz_id}_results.csv"'
            
            if data and len(data) > 0:
                writer = csv.DictWriter(response, fieldnames=data[0].keys())
                writer.writeheader()
                writer.writerows(data)
            else:
                # Handle empty data case for CSV
                fieldnames = ['student_name', 'student_number', 'score_percentage', 'difficulty', 'started_at', 'completed_at', 'time_taken']
                writer = csv.DictWriter(response, fieldnames=fieldnames)
                writer.writeheader()
            
            return response
        
        else:  # JSON format
            return Response({
                'quiz_id': adaptive_quiz.id,
                'quiz_title': adaptive_quiz.lecture_slide.title,
                'difficulty': adaptive_quiz.difficulty,
                'export_date': timezone.now(),
                'results': data
            })
            
    except AdaptiveQuiz.DoesNotExist:
        return Response({'error': 'AI Quiz not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsLecturerPermission])
def export_course_data(request, course_id):
    """Export comprehensive course data - AI quiz focused"""
    format_type = request.query_params.get('format', 'json')
    
    try:
        course = Course.objects.get(id=course_id, lecturer=request.user)
        
        # Get all AI quiz attempts for this course
        attempts = AdaptiveQuizAttempt.objects.filter(
            progress__adaptive_quiz__lecture_slide__topic__course=course
        )
        
        data = []
        for attempt in attempts:
            data.append({
                'student_name': attempt.progress.student.get_full_name(),
                'student_number': attempt.progress.student.student_number,
                'topic_name': attempt.progress.adaptive_quiz.lecture_slide.topic.name,
                'quiz_title': attempt.progress.adaptive_quiz.lecture_slide.title,
                'difficulty': attempt.progress.adaptive_quiz.difficulty,
                'score_percentage': attempt.score_percentage,
                'completed_at': attempt.completed_at
            })
        
        if format_type == 'csv':
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="course_{course.code}_ai_quiz_data.csv"'
            
            if data and len(data) > 0:
                writer = csv.DictWriter(response, fieldnames=data[0].keys())
                writer.writeheader()
                writer.writerows(data)
            else:
                # Handle empty data case for CSV
                fieldnames = ['student_name', 'student_number', 'topic_name', 'quiz_title', 'difficulty', 'score_percentage', 'completed_at']
                writer = csv.DictWriter(response, fieldnames=fieldnames)
                writer.writeheader()
            
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