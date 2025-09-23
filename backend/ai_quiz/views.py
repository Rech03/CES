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
    
    # Fix: Remove the problematic filter
    slides = LectureSlide.objects.filter(
        topic__course_id__in=enrolled_course_ids,
        questions_generated=True
    ).distinct().order_by('-created_at')
    
    slides_data = []
    
    for slide in slides:
        # Get quiz access information for this student
        available_quizzes = AdaptiveQuizService.get_available_quizzes_for_student(
            student, slide
        )
        
        # Only include slides that have published quizzes
        if not available_quizzes:
            continue
            
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


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsStudentPermission])
def get_student_available_quizzes(request):
    """
    Get all available quizzes for student with comprehensive access and progress information
    """
    student = request.user
    
    try:
        # Get enrolled courses
        from courses.models import CourseEnrollment
        
        enrolled_course_ids = CourseEnrollment.objects.filter(
            student=student,
            is_active=True
        ).values_list('course_id', flat=True)
        
        if not enrolled_course_ids:
            return Response({
                'message': 'No enrolled courses found',
                'quizzes': []
            })
        
        # Get all published quizzes from enrolled courses
        available_quizzes = AdaptiveQuiz.objects.filter(
            lecture_slide__topic__course_id__in=enrolled_course_ids,
            status='published',
            is_active=True
        ).select_related(
            'lecture_slide',
            'lecture_slide__topic',
            'lecture_slide__topic__course'
        ).order_by(
            'lecture_slide__topic__course__code',
            'lecture_slide__title',
            'difficulty'
        )
        
        # Get student's progress for all these quizzes
        student_progress = StudentAdaptiveProgress.objects.filter(
            student=student,
            adaptive_quiz__in=available_quizzes
        ).select_related('adaptive_quiz')
        
        # Create progress lookup dictionary
        progress_lookup = {
            progress.adaptive_quiz.id: progress 
            for progress in student_progress
        }
        
        # Group quizzes by slide for easier processing
        slides_data = {}
        
        for quiz in available_quizzes:
            slide_id = quiz.lecture_slide.id
            
            if slide_id not in slides_data:
                slides_data[slide_id] = {
                    'slide_info': {
                        'slide_id': slide_id,
                        'title': quiz.lecture_slide.title,
                        'topic_name': quiz.lecture_slide.topic.name,
                        'course_code': quiz.lecture_slide.topic.course.code,
                        'course_name': quiz.lecture_slide.topic.course.name,
                        'created_at': quiz.lecture_slide.created_at
                    },
                    'quizzes': []
                }
            
            # Get progress for this specific quiz
            progress = progress_lookup.get(quiz.id)
            
            # Determine accessibility based on adaptive learning rules
            accessible = True
            access_reason = "Available"
            
            if quiz.difficulty == 'medium':
                # Check if easy level is completed
                easy_quiz = AdaptiveQuiz.objects.filter(
                    lecture_slide=quiz.lecture_slide,
                    difficulty='easy',
                    status='published',
                    is_active=True
                ).first()
                
                if easy_quiz:
                    easy_progress = progress_lookup.get(easy_quiz.id)
                    if not easy_progress or not easy_progress.completed:
                        accessible = False
                        access_reason = "Complete Easy level first"
            
            elif quiz.difficulty == 'hard':
                # Check if medium level is completed
                medium_quiz = AdaptiveQuiz.objects.filter(
                    lecture_slide=quiz.lecture_slide,
                    difficulty='medium',
                    status='published',
                    is_active=True
                ).first()
                
                if medium_quiz:
                    medium_progress = progress_lookup.get(medium_quiz.id)
                    if not medium_progress or not medium_progress.completed:
                        accessible = False
                        access_reason = "Complete Medium level first"
            
            # Determine status
            if not progress:
                status = "not_started"
            elif progress.completed:
                status = "completed"
            else:
                status = "in_progress"
            
            quiz_data = {
                'quiz_id': quiz.id,
                'difficulty': quiz.difficulty,
                'accessible': accessible,
                'access_reason': access_reason,
                'status': status,
                'question_count': quiz.get_question_count(),
                'progress': {
                    'attempts_count': progress.attempts_count if progress else 0,
                    'best_score': progress.best_score if progress else None,
                    'latest_score': progress.latest_score if progress else None,
                    'completed': progress.completed if progress else False,
                    'last_attempt_at': progress.last_attempt_at if progress else None
                }
            }
            
            slides_data[slide_id]['quizzes'].append(quiz_data)
        
        # Convert to list format and add summary statistics
        response_data = []
        total_quizzes = 0
        completed_quizzes = 0
        accessible_quizzes = 0
        
        for slide_data in slides_data.values():
            # Sort quizzes by difficulty (easy, medium, hard)
            difficulty_order = {'easy': 1, 'medium': 2, 'hard': 3}
            slide_data['quizzes'].sort(key=lambda x: difficulty_order.get(x['difficulty'], 4))
            
            # Calculate slide-level statistics
            slide_total = len(slide_data['quizzes'])
            slide_completed = sum(1 for q in slide_data['quizzes'] if q['status'] == 'completed')
            slide_accessible = sum(1 for q in slide_data['quizzes'] if q['accessible'])
            
            slide_data['slide_info']['statistics'] = {
                'total_quizzes': slide_total,
                'completed_quizzes': slide_completed,
                'accessible_quizzes': slide_accessible,
                'completion_rate': (slide_completed / slide_total * 100) if slide_total > 0 else 0
            }
            
            total_quizzes += slide_total
            completed_quizzes += slide_completed
            accessible_quizzes += slide_accessible
            
            response_data.append(slide_data)
        
        # Sort slides by course code and title
        response_data.sort(key=lambda x: (
            x['slide_info']['course_code'],
            x['slide_info']['title']
        ))
        
        # Overall statistics
        summary_stats = {
            'total_quizzes': total_quizzes,
            'completed_quizzes': completed_quizzes,
            'accessible_quizzes': accessible_quizzes,
            'overall_completion_rate': (completed_quizzes / total_quizzes * 100) if total_quizzes > 0 else 0,
            'total_slides': len(response_data),
            'courses_count': len(set(slide['slide_info']['course_code'] for slide in response_data))
        }
        
        return Response({
            'summary': summary_stats,
            'slides': response_data
        })
        
    except Exception as e:
        return Response(
            {'error': f'Failed to fetch available quizzes: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsStudentPermission])
def get_student_quiz_summary(request):
    """
    Get a condensed summary of student's quiz progress for dashboard
    """
    student = request.user
    
    try:
        # Get recent quiz attempts (last 10)
        recent_attempts = AdaptiveQuizAttempt.objects.filter(
            progress__student=student
        ).select_related(
            'progress__adaptive_quiz__lecture_slide__topic__course'
        ).order_by('-started_at')[:10]
        
        # Get overall progress statistics
        all_progress = StudentAdaptiveProgress.objects.filter(
            student=student
        ).select_related('adaptive_quiz__lecture_slide__topic__course')
        
        # Calculate statistics by difficulty
        difficulty_stats = {}
        for difficulty in ['easy', 'medium', 'hard']:
            difficulty_progress = all_progress.filter(adaptive_quiz__difficulty=difficulty)
            difficulty_stats[difficulty] = {
                'total': difficulty_progress.count(),
                'completed': difficulty_progress.filter(completed=True).count(),
                'average_score': difficulty_progress.filter(completed=True).aggregate(
                    avg=Avg('best_score')
                )['avg'] or 0,
                'completion_rate': (
                    difficulty_progress.filter(completed=True).count() / 
                    difficulty_progress.count() * 100
                ) if difficulty_progress.exists() else 0
            }
        
        # Recent attempts data
        recent_attempts_data = []
        for attempt in recent_attempts:
            recent_attempts_data.append({
                'quiz_id': attempt.progress.adaptive_quiz.id,
                'slide_title': attempt.progress.adaptive_quiz.lecture_slide.title,
                'course_code': attempt.progress.adaptive_quiz.lecture_slide.topic.course.code,
                'difficulty': attempt.progress.adaptive_quiz.difficulty,
                'score': attempt.score,
                'completed': attempt.completed,
                'started_at': attempt.started_at,
                'completed_at': attempt.completed_at
            })
        
        # Overall statistics
        overall_stats = {
            'total_quizzes_attempted': all_progress.count(),
            'total_quizzes_completed': all_progress.filter(completed=True).count(),
            'overall_completion_rate': (
                all_progress.filter(completed=True).count() / 
                all_progress.count() * 100
            ) if all_progress.exists() else 0,
            'average_score': all_progress.filter(completed=True).aggregate(
                avg=Avg('best_score')
            )['avg'] or 0,
            'total_attempts': all_progress.aggregate(
                total=Sum('attempts_count')
            )['total'] or 0
        }
        
        return Response({
            'overall_stats': overall_stats,
            'difficulty_breakdown': difficulty_stats,
            'recent_attempts': recent_attempts_data
        })
        
    except Exception as e:
        return Response(
            {'error': f'Failed to fetch quiz summary: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsLecturerPermission])
def get_lecturer_available_quizzes(request):
    """
    Get all quizzes for lecturer's courses with comprehensive management information
    """
    lecturer = request.user
    course_id = request.query_params.get('course_id')
    status_filter = request.query_params.get('status')  # draft, under_review, published, rejected
    difficulty_filter = request.query_params.get('difficulty')  # easy, medium, hard
    
    try:
        # Get lecturer's courses
        from courses.models import Course
        courses = Course.objects.filter(lecturer=lecturer, is_active=True)
        
        if course_id:
            courses = courses.filter(id=course_id)
        
        # Get all quizzes from lecturer's courses
        quizzes_query = AdaptiveQuiz.objects.filter(
            lecture_slide__topic__course__in=courses
        ).select_related(
            'lecture_slide',
            'lecture_slide__topic',
            'lecture_slide__topic__course',
            'reviewed_by'
        )
        
        # Apply filters
        if status_filter:
            quizzes_query = quizzes_query.filter(status=status_filter)
        
        if difficulty_filter:
            quizzes_query = quizzes_query.filter(difficulty=difficulty_filter)
        
        quizzes = quizzes_query.order_by(
            'lecture_slide__topic__course__code',
            'lecture_slide__title',
            'difficulty'
        )
        
        # Get student engagement statistics for these quizzes
        quiz_ids = list(quizzes.values_list('id', flat=True))
        
        # Get progress statistics
        progress_stats = StudentAdaptiveProgress.objects.filter(
            adaptive_quiz_id__in=quiz_ids
        ).values('adaptive_quiz_id').annotate(
            total_students=Count('student', distinct=True),
            total_attempts=Sum('attempts_count'),
            completed_count=Count('id', filter=models.Q(completed=True)),
            avg_score=Avg('best_score', filter=models.Q(completed=True))
        )
        
        # Create lookup dictionary for progress stats
        progress_lookup = {
            stat['adaptive_quiz_id']: stat for stat in progress_stats
        }
        
        # Group quizzes by slide
        slides_data = {}
        
        for quiz in quizzes:
            slide_id = quiz.lecture_slide.id
            
            if slide_id not in slides_data:
                slides_data[slide_id] = {
                    'slide_info': {
                        'slide_id': slide_id,
                        'title': quiz.lecture_slide.title,
                        'topic_name': quiz.lecture_slide.topic.name,
                        'course_code': quiz.lecture_slide.topic.course.code,
                        'course_name': quiz.lecture_slide.topic.course.name,
                        'course_id': quiz.lecture_slide.topic.course.id,
                        'uploaded_at': quiz.lecture_slide.created_at,
                        'has_extracted_text': bool(quiz.lecture_slide.extracted_text),
                        'file_name': quiz.lecture_slide.slide_file.name if quiz.lecture_slide.slide_file else None
                    },
                    'quizzes': []
                }
            
            # Get progress statistics for this quiz
            stats = progress_lookup.get(quiz.id, {
                'total_students': 0,
                'total_attempts': 0,
                'completed_count': 0,
                'avg_score': 0
            })
            
            quiz_data = {
                'quiz_id': quiz.id,
                'difficulty': quiz.difficulty,
                'status': quiz.status,
                'is_active': quiz.is_active,
                'question_count': quiz.get_question_count(),
                'created_at': quiz.created_at,
                'reviewed_by': quiz.reviewed_by.get_full_name() if quiz.reviewed_by else None,
                'reviewed_at': quiz.reviewed_at,
                'review_notes': quiz.review_notes,
                'engagement_stats': {
                    'total_students_attempted': stats['total_students'],
                    'total_attempts': stats['total_attempts'] or 0,
                    'students_completed': stats['completed_count'],
                    'completion_rate': (
                        (stats['completed_count'] / stats['total_students'] * 100) 
                        if stats['total_students'] > 0 else 0
                    ),
                    'average_score': round(stats['avg_score'] or 0, 1)
                }
            }
            
            slides_data[slide_id]['quizzes'].append(quiz_data)
        
        # Convert to list and add slide-level statistics
        response_data = []
        total_quizzes = 0
        published_quizzes = 0
        pending_review = 0
        total_student_attempts = 0
        
        for slide_data in slides_data.values():
            # Sort quizzes by difficulty
            difficulty_order = {'easy': 1, 'medium': 2, 'hard': 3}
            slide_data['quizzes'].sort(key=lambda x: difficulty_order.get(x['difficulty'], 4))
            
            # Calculate slide-level statistics
            slide_total = len(slide_data['quizzes'])
            slide_published = sum(1 for q in slide_data['quizzes'] if q['status'] == 'published')
            slide_pending = sum(1 for q in slide_data['quizzes'] if q['status'] in ['draft', 'under_review'])
            slide_attempts = sum(q['engagement_stats']['total_attempts'] for q in slide_data['quizzes'])
            
            slide_data['slide_info']['statistics'] = {
                'total_quizzes': slide_total,
                'published_quizzes': slide_published,
                'pending_review': slide_pending,
                'total_attempts': slide_attempts,
                'publication_rate': (slide_published / slide_total * 100) if slide_total > 0 else 0
            }
            
            total_quizzes += slide_total
            published_quizzes += slide_published
            pending_review += slide_pending
            total_student_attempts += slide_attempts
            
            response_data.append(slide_data)
        
        # Sort slides by course and title
        response_data.sort(key=lambda x: (
            x['slide_info']['course_code'],
            x['slide_info']['title']
        ))
        
        # Overall statistics
        summary_stats = {
            'total_quizzes': total_quizzes,
            'published_quizzes': published_quizzes,
            'pending_review': pending_review,
            'draft_quizzes': total_quizzes - published_quizzes,
            'publication_rate': (published_quizzes / total_quizzes * 100) if total_quizzes > 0 else 0,
            'total_slides': len(response_data),
            'courses_count': len(set(slide['slide_info']['course_code'] for slide in response_data)),
            'total_student_attempts': total_student_attempts
        }
        
        # Status breakdown
        status_breakdown = {}
        for quiz in quizzes:
            status = quiz.status
            if status not in status_breakdown:
                status_breakdown[status] = 0
            status_breakdown[status] += 1
        
        return Response({
            'summary': summary_stats,
            'status_breakdown': status_breakdown,
            'slides': response_data
        })
        
    except Exception as e:
        return Response(
            {'error': f'Failed to fetch lecturer quizzes: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )