from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.authentication import TokenAuthentication
from django.utils import timezone
from django.db import transaction
from django.db.models import Avg, Count, Sum

from .models import LectureSlide, AdaptiveQuiz, StudentAdaptiveProgress, AdaptiveQuizAttempt
from .serializers import (
    LectureSlideSerializer, AdaptiveQuizSerializer, LectureSlideUploadSerializer,
    GenerateQuestionsSerializer, AdaptiveQuizTakeSerializer, QuizResultSerializer,
    LectureSlideQuizzesSerializer, StudentQuizAccessSerializer
)
from .services import ClaudeAPIService, AdaptiveQuizService
from courses.models import Topic
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
@permission_classes([permissions.IsAuthenticated, IsLecturerPermission])
def upload_lecture_slide(request):
    """Upload lecture slides and extract text"""
    serializer = LectureSlideUploadSerializer(
        data=request.data,
        context={'request': request}
    )
    
    if serializer.is_valid():
        topic_id = serializer.validated_data['topic_id']
        title = serializer.validated_data['title']
        slide_file = serializer.validated_data['slide_file']
        
        try:
            topic = Topic.objects.get(id=topic_id)
            
            # Create lecture slide
            lecture_slide = LectureSlide.objects.create(
                topic=topic,
                title=title,
                slide_file=slide_file,
                uploaded_by=request.user
            )
            
            return Response({
                'message': 'Slide uploaded successfully',
                'slide_id': lecture_slide.id,
                'slide': LectureSlideSerializer(lecture_slide).data
            }, status=status.HTTP_201_CREATED)
            
        except Topic.DoesNotExist:
            return Response(
                {'error': 'Topic not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Upload failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsLecturerPermission])
def generate_adaptive_questions(request):
    """Generate adaptive questions using Claude API"""
    serializer = GenerateQuestionsSerializer(
        data=request.data,
        context={'request': request}
    )
    
    if serializer.is_valid():
        slide_id = serializer.validated_data['lecture_slide_id']
        
        try:
            lecture_slide = LectureSlide.objects.get(id=slide_id)
            
            # Check if text was extracted
            if not lecture_slide.extracted_text:
                return Response(
                    {'error': 'No text content found in slide. Please check the PDF.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Generate questions using Claude API
            claude_service = ClaudeAPIService()
            questions_data = claude_service.generate_questions_from_content(
                lecture_slide.extracted_text,
                lecture_slide.title
            )
            
            # Create adaptive quizzes for each difficulty
            created_quizzes = []
            difficulties = ['easy', 'medium', 'hard']
            
            with transaction.atomic():
                for difficulty in difficulties:
                    # Filter questions for this difficulty
                    difficulty_questions = [
                        q for q in questions_data.get('questions', [])
                        if q.get('difficulty') == difficulty
                    ]
                    
                    if difficulty_questions:
                        quiz_data = {
                            'questions': difficulty_questions
                        }
                        
                        adaptive_quiz = AdaptiveQuiz.objects.create(
                            lecture_slide=lecture_slide,
                            difficulty=difficulty,
                            questions_data=quiz_data
                        )
                        
                        created_quizzes.append(adaptive_quiz)
                
                # Mark slide as having questions generated
                lecture_slide.questions_generated = True
                lecture_slide.save()
            
            return Response({
                'message': f'Generated {len(created_quizzes)} adaptive quizzes',
                'quizzes': AdaptiveQuizSerializer(created_quizzes, many=True).data
            }, status=status.HTTP_201_CREATED)
            
        except LectureSlide.DoesNotExist:
            return Response(
                {'error': 'Lecture slide not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Question generation failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsLecturerPermission])
def lecturer_lecture_slides(request):
    """Get all lecture slides for lecturer's courses"""
    lecturer = request.user
    
    # Get slides from lecturer's courses
    slides = LectureSlide.objects.filter(
        topic__course__lecturer=lecturer
    ).order_by('-created_at')
    
    serializer = LectureSlideSerializer(slides, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsStudentPermission])
def student_available_slides(request):
    """Get available lecture slides for student with quiz access info"""
    student = request.user
    
    # Get slides from courses student is enrolled in
    from courses.models import CourseEnrollment
    
    enrolled_course_ids = CourseEnrollment.objects.filter(
        student=student,
        is_active=True
    ).values_list('course_id', flat=True)
    
    slides = LectureSlide.objects.filter(
        topic__course_id__in=enrolled_course_ids,
        questions_generated=True,
        adaptive_quizzes_status='published'
    ).order_by('-created_at')
    
    slides_data = []
    
    for slide in slides:
        # Get quiz access information for this student
        available_quizzes = AdaptiveQuizService.get_available_quizzes_for_student(
            student, slide
        )
        
        quiz_access_data = []
        for quiz_info in available_quizzes:
            quiz_access_data.append({
                'quiz_id': quiz_info['quiz'].id,
                'difficulty': quiz_info['quiz'].difficulty,
                'accessible': quiz_info['accessible'],
                'status': quiz_info['status'],
                'best_score': quiz_info['progress'].best_score,
                'attempts_count': quiz_info['progress'].attempts_count,
                'question_count': quiz_info['quiz'].get_question_count()
            })
        
        slide_data = {
            'slide_id': slide.id,
            'title': slide.title,
            'topic_name': slide.topic.name,
            'course_code': slide.topic.course.code,
            'questions_generated': slide.questions_generated,
            'available_quizzes': quiz_access_data,
            'created_at': slide.created_at
        }
        
        slides_data.append(slide_data)
    
    return Response(slides_data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsStudentPermission])
def get_adaptive_quiz(request, quiz_id):
    """Get adaptive quiz questions for student"""
    student = request.user
    
    try:
        # Updated to check both is_active AND published status
        adaptive_quiz = AdaptiveQuiz.objects.get(
            id=quiz_id, 
            is_active=True,
            status='published'  # Only allow published quizzes
        )
        
        # Check if student can access this quiz
        available_quizzes = AdaptiveQuizService.get_available_quizzes_for_student(
            student, adaptive_quiz.lecture_slide
        )
        
        # Find this quiz in available quizzes
        quiz_accessible = False
        for quiz_info in available_quizzes:
            if quiz_info['quiz'].id == adaptive_quiz.id:
                quiz_accessible = quiz_info['accessible']
                break
        
        if not quiz_accessible:
            return Response(
                {'error': 'Quiz not accessible. Complete previous difficulty level first.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get questions (hide correct answers and explanations)
        questions_data = adaptive_quiz.get_questions()
        questions = questions_data.get('questions', [])
        
        # Remove correct answers and explanations for student view
        student_questions = []
        for i, question in enumerate(questions):
            student_question = {
                'question_number': i,
                'question': question.get('question'),
                'options': question.get('options'),
                'difficulty': question.get('difficulty')
            }
            student_questions.append(student_question)
        
        return Response({
            'quiz_id': adaptive_quiz.id,
            'title': adaptive_quiz.lecture_slide.title,
            'difficulty': adaptive_quiz.difficulty,
            'question_count': len(student_questions),
            'questions': student_questions
        })
        
    except AdaptiveQuiz.DoesNotExist:
        return Response(
            {'error': 'Quiz not found or not available'},
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsStudentPermission])
def submit_adaptive_quiz(request):
    """Submit adaptive quiz attempt - now integrated with attendance, analytics, and achievements"""
    student = request.user
    serializer = AdaptiveQuizTakeSerializer(data=request.data)
    
    if serializer.is_valid():
        quiz_id = serializer.validated_data['adaptive_quiz_id']
        answers = serializer.validated_data['answers']
        
        try:
            adaptive_quiz = AdaptiveQuiz.objects.get(id=quiz_id, is_active=True)
            
            with transaction.atomic():
                # Process the attempt
                result = AdaptiveQuizService.process_quiz_attempt(
                    student, adaptive_quiz, answers
                )
                
                # Get the created attempt for further processing
                latest_attempt = AdaptiveQuizAttempt.objects.filter(
                    progress__student=student,
                    progress__adaptive_quiz=adaptive_quiz
                ).order_by('-started_at').first()
                
                # ATTENDANCE INTEGRATION
                # Mark attendance for ANY AI quiz completion (easy level sufficient)
                from courses.models import Attendance
                course = adaptive_quiz.lecture_slide.topic.course
                attendance, created = Attendance.objects.update_or_create(
                    student=student,
                    course=course,
                    date=timezone.now().date(),
                    defaults={
                        'is_present': True,
                        'verified_by_quiz': True,
                    }
                )
                
                # ANALYTICS INTEGRATION
                # Update student engagement metrics for analytics
                from analytics.models import StudentEngagementMetrics
                try:
                    metrics, created = StudentEngagementMetrics.objects.get_or_create(
                        student=student,
                        course=course
                    )
                    metrics.calculate_ai_quiz_metrics()  # Will need to implement this method
                except Exception as e:
                    # Log the error but don't fail the quiz submission
                    print(f"Analytics update failed: {e}")
                
                # Track daily engagement for analytics heatmap
                from analytics.models import DailyEngagement
                DailyEngagement.mark_engagement(student)
                
                # ACHIEVEMENTS INTEGRATION
                # Process achievements for AI quiz completion
                from achievements.services import AchievementService
                try:
                    achievement_result = AchievementService.process_ai_quiz_completion(
                        student, latest_attempt
                    )
                    
                    # Add achievement data to response
                    result['achievement_data'] = {
                        'xp_earned': achievement_result.get('xp_earned', 0),
                        'total_xp': achievement_result.get('total_xp', 0),
                        'level': achievement_result.get('level', 1),
                        'new_badges': [
                            {
                                'name': badge.badge_type.name,
                                'icon': badge.badge_type.icon,
                                'color': badge.badge_type.color,
                                'xp_reward': badge.badge_type.xp_reward
                            } for badge in achievement_result.get('new_badges', [])
                        ],
                        'current_streak': achievement_result.get('streak', 0)
                    }
                except Exception as e:
                    print(f"Achievement processing failed: {e}")
                    result['achievement_data'] = None
            
            # Prepare response data
            response_data = {
                'score': result['score'],
                'correct_count': result['correct_count'],
                'total_questions': result['total_questions'],
                'completed': result['completed'],
                'show_explanation': result['show_explanation'],
                'unlocked_next': result['unlocked_next'],
                'attendance_marked': True,
                'achievement_data': result.get('achievement_data')
            }
            
            # Include explanations if student should see them
            if result['show_explanation']:
                questions = adaptive_quiz.get_questions().get('questions', [])
                explanations = []
                
                for i, question in enumerate(questions):
                    question_key = f"question_{i}"
                    student_answer = answers.get(question_key)
                    correct_answer = question.get('correct_answer')
                    
                    explanations.append({
                        'question_number': i,
                        'question': question.get('question'),
                        'student_answer': student_answer,
                        'correct_answer': correct_answer,
                        'explanation': question.get('explanation'),
                        'is_correct': student_answer == correct_answer
                    })
                
                response_data['explanations'] = explanations
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except AdaptiveQuiz.DoesNotExist:
            return Response(
                {'error': 'Quiz not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsStudentPermission])
def student_adaptive_progress(request):
    """Get student's progress across all adaptive quizzes"""
    student = request.user
    
    progress_records = StudentAdaptiveProgress.objects.filter(
        student=student
    ).order_by('-last_attempt_at')
    
    progress_data = []
    
    for progress in progress_records:
        progress_info = {
            'slide_title': progress.adaptive_quiz.lecture_slide.title,
            'course_code': progress.adaptive_quiz.lecture_slide.topic.course.code,
            'difficulty': progress.adaptive_quiz.difficulty,
            'attempts_count': progress.attempts_count,
            'best_score': progress.best_score,
            'latest_score': progress.latest_score,
            'completed': progress.completed,
            'last_attempt_at': progress.last_attempt_at
        }
        progress_data.append(progress_info)
    
    return Response(progress_data)


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated, IsLecturerPermission])
def delete_lecture_slide(request, slide_id):
    """Delete lecture slide and associated quizzes"""
    try:
        slide = LectureSlide.objects.get(
            id=slide_id,
            uploaded_by=request.user
        )
        
        slide.delete()
        
        return Response({
            'message': 'Lecture slide deleted successfully'
        })
        
    except LectureSlide.DoesNotExist:
        return Response(
            {'error': 'Slide not found or you do not have permission to delete it'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsLecturerPermission])
def regenerate_questions(request, slide_id):
    """Regenerate questions for a lecture slide"""
    try:
        slide = LectureSlide.objects.get(
            id=slide_id,
            uploaded_by=request.user
        )
        
        # Delete existing quizzes
        AdaptiveQuiz.objects.filter(lecture_slide=slide).delete()
        
        # Reset the flag
        slide.questions_generated = False
        slide.save()
        
        # Regenerate questions
        request.data['lecture_slide_id'] = slide_id
        return generate_adaptive_questions(request)
        
    except LectureSlide.DoesNotExist:
        return Response(
            {'error': 'Slide not found or you do not have permission'},
            status=status.HTTP_404_NOT_FOUND
        )


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
        from courses.models import Course
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
def get_quiz_for_moderation(request, quiz_id):
    """Get quiz with full question details for moderation"""
    try:
        quiz = AdaptiveQuiz.objects.get(
            id=quiz_id,
            lecture_slide__topic__course__lecturer=request.user
        )
        
        # Return full questions including correct answers
        return Response({
            'quiz_id': quiz.id,
            'title': quiz.lecture_slide.title,
            'difficulty': quiz.difficulty,
            'status': quiz.status,
            'questions': quiz.get_questions().get('questions', []),
            'created_at': quiz.created_at,
            'review_notes': quiz.review_notes
        })
    except AdaptiveQuiz.DoesNotExist:
        return Response({'error': 'Quiz not found'}, status=404)

@api_view(['PUT'])
@permission_classes([permissions.IsAuthenticated, IsLecturerPermission])
def update_quiz_questions(request, quiz_id):
    """Update quiz questions during moderation"""
    try:
        quiz = AdaptiveQuiz.objects.get(
            id=quiz_id,
            lecture_slide__topic__course__lecturer=request.user
        )
        
        if quiz.status == 'published':
            return Response({'error': 'Cannot edit published quiz'}, status=400)
        
        questions_data = request.data.get('questions', [])
        
        # Validate questions structure
        for question in questions_data:
            required_fields = ['difficulty', 'question', 'options', 'correct_answer', 'explanation']
            if not all(field in question for field in required_fields):
                return Response({'error': 'Invalid question structure'}, status=400)
        
        # Update quiz questions
        quiz.questions_data = {'questions': questions_data}
        quiz.status = 'under_review'
        quiz.save()
        
        return Response({'message': 'Quiz updated successfully'})
    except AdaptiveQuiz.DoesNotExist:
        return Response({'error': 'Quiz not found'}, status=404)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsLecturerPermission])
def publish_quiz(request, quiz_id):
    """Publish quiz after moderation"""
    try:
        quiz = AdaptiveQuiz.objects.get(
            id=quiz_id,
            lecture_slide__topic__course__lecturer=request.user
        )
        
        review_notes = request.data.get('review_notes', '')
        
        quiz.status = 'published'
        quiz.reviewed_by = request.user
        quiz.reviewed_at = timezone.now()
        quiz.review_notes = review_notes
        quiz.save()
        
        return Response({'message': 'Quiz published successfully'})
    except AdaptiveQuiz.DoesNotExist:
        return Response({'error': 'Quiz not found'}, status=404)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsLecturerPermission])
def get_quizzes_for_review(request):
    """Get all quizzes needing review"""
    quizzes = AdaptiveQuiz.objects.filter(
        lecture_slide__topic__course__lecturer=request.user,
        status__in=['draft', 'under_review']
    ).order_by('-created_at')
    
    quiz_data = []
    for quiz in quizzes:
        quiz_data.append({
            'quiz_id': quiz.id,
            'title': quiz.lecture_slide.title,
            'difficulty': quiz.difficulty,
            'status': quiz.status,
            'question_count': quiz.get_question_count(),
            'created_at': quiz.created_at,
            'course_code': quiz.lecture_slide.topic.course.code
        })
    
    return Response(quiz_data)