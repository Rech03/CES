from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.authentication import TokenAuthentication
from django.db.models import  Avg
from django.db import transaction

from .models import Quiz, Question, Choice, QuizAttempt, Answer
from .serializers import (
    QuizSerializer, QuestionSerializer, QuestionCreateSerializer, ChoiceSerializer,
    QuizAttemptSerializer, AnswerSerializer, StartQuizAttemptSerializer,
    SubmitAnswerSerializer, LiveQuizSerializer, QuizResultSerializer,
    AvailableQuizSerializer
)
from courses.models import CourseEnrollment


class IsLecturerOrReadOnly(permissions.BasePermission):
    """Custom permission for lecturers"""
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        return request.user.is_authenticated and request.user.is_lecturer


class IsEnrolledStudent(permissions.BasePermission):
    """Permission for enrolled students"""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_student
    
    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'course'):
            course = obj.course
        elif hasattr(obj, 'topic'):
            course = obj.topic.course
        elif hasattr(obj, 'quiz'):
            course = obj.quiz.topic.course
        else:
            # For quiz objects
            course = obj.topic.course
        
        return CourseEnrollment.objects.filter(
            student=request.user,
            course=course,
            is_active=True
        ).exists()


class QuizViewSet(viewsets.ModelViewSet):
    """Quiz CRUD operations"""
    queryset = Quiz.objects.all()  # Add this line
    serializer_class = QuizSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_lecturer:
            return Quiz.objects.filter(topic__course__lecturer=user)
        elif user.is_student:
            return Quiz.objects.filter(
                topic__course__enrollments__student=user,
                topic__course__enrollments__is_active=True,
                is_active=True
            )
        return Quiz.objects.none()
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'start_live', 'stop_live']:
            permission_classes = [permissions.IsAuthenticated, IsLecturerOrReadOnly]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def perform_create(self, serializer):
        # Ensure lecturer owns the course
        topic = serializer.validated_data['topic']
        if topic.course.lecturer != self.request.user:
            raise permissions.PermissionDenied(
                "You can only create quizzes for your own courses"
            )
        serializer.save()
    
    @action(detail=True, methods=['post'])
    def start_live(self, request, pk=None):
        """Start a live quiz session"""
        quiz = self.get_object()
        
        if quiz.topic.course.lecturer != request.user:
            return Response(
                {'error': 'Only the course lecturer can start live quizzes'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = LiveQuizSerializer(data=request.data)
        if serializer.is_valid():
            password = serializer.validated_data['password']
            quiz.start_live_quiz(password)
            
            return Response({
                'message': 'Live quiz started successfully',
                'quiz_id': quiz.id,
                'password': password
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def stop_live(self, request, pk=None):
        """Stop a live quiz session"""
        quiz = self.get_object()
        
        if quiz.topic.course.lecturer != request.user:
            return Response(
                {'error': 'Only the course lecturer can stop live quizzes'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        quiz.stop_live_quiz()
        
        return Response({
            'message': 'Live quiz stopped successfully'
        })
    
    @action(detail=True, methods=['get'])
    def questions(self, request, pk=None):
        """Get quiz questions"""
        quiz = self.get_object()
        questions = quiz.questions.all().order_by('order')
        serializer = QuestionSerializer(questions, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def attempts(self, request, pk=None):
        """Get quiz attempts (lecturer only)"""
        quiz = self.get_object()
        
        if quiz.topic.course.lecturer != request.user:
            return Response(
                {'error': 'Only the course lecturer can view attempts'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        attempts = quiz.attempts.all().order_by('-started_at')
        serializer = QuizAttemptSerializer(attempts, many=True)
        return Response(serializer.data)


class QuestionViewSet(viewsets.ModelViewSet):
    """Question CRUD operations"""
    queryset = Question.objects.all()  # Add this line
    authentication_classes = [TokenAuthentication]
    permission_classes = [permissions.IsAuthenticated, IsLecturerOrReadOnly]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return QuestionCreateSerializer
        return QuestionSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.is_lecturer:
            return Question.objects.filter(quiz__topic__course__lecturer=user)
        return Question.objects.none()
    
    def perform_create(self, serializer):
        # Ensure lecturer owns the course
        quiz = serializer.validated_data['quiz']
        if quiz.topic.course.lecturer != self.request.user:
            raise permissions.PermissionDenied(
                "You can only create questions for your own quizzes"
            )
        serializer.save()
    
    @action(detail=True, methods=['post'])
    def add_choice(self, request, pk=None):
        """Add a choice to a question"""
        question = self.get_object()
        
        serializer = ChoiceSerializer(data=request.data)
        if serializer.is_valid():
            choice = serializer.save(question=question)
            return Response(
                ChoiceSerializer(choice).data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChoiceViewSet(viewsets.ModelViewSet):
    """Choice CRUD operations"""
    queryset = Choice.objects.all()  # Add this line
    serializer_class = ChoiceSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [permissions.IsAuthenticated, IsLecturerOrReadOnly]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_lecturer:
            return Choice.objects.filter(
                question__quiz__topic__course__lecturer=user
            )
        return Choice.objects.none()


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def start_quiz_attempt(request):
    """Start a quiz attempt for a student"""
    if not request.user.is_student:
        return Response(
            {'error': 'Only students can start quiz attempts'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    serializer = StartQuizAttemptSerializer(
        data=request.data,
        context={'request': request}
    )
    
    if serializer.is_valid():
        quiz = serializer.validated_data['quiz']
        password = serializer.validated_data.get('password', '')
        
        # Create quiz attempt
        attempt = QuizAttempt.objects.create(
            student=request.user,
            quiz=quiz,
            password_used=password
        )
        
        return Response({
            'message': 'Quiz attempt started successfully',
            'attempt_id': attempt.id,
            'quiz': QuizSerializer(quiz).data
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def submit_answer(request):
    """Submit an answer for a quiz question"""
    if not request.user.is_student:
        return Response(
            {'error': 'Only students can submit answers'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    attempt_id = request.data.get('attempt_id')
    if not attempt_id:
        return Response(
            {'error': 'Attempt ID is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        attempt = QuizAttempt.objects.get(
            id=attempt_id,
            student=request.user,
            is_completed=False
        )
    except QuizAttempt.DoesNotExist:
        return Response(
            {'error': 'Quiz attempt not found or already completed'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = SubmitAnswerSerializer(data=request.data)
    if serializer.is_valid():
        question = serializer.validated_data['question']
        
        # Check if question belongs to the quiz
        if question.quiz != attempt.quiz:
            return Response(
                {'error': 'Question does not belong to this quiz'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create or update answer
        answer_data = {
            'quiz_attempt': attempt,
            'question': question,
        }
        
        if question.question_type in ['MCQ', 'TF']:
            answer_data['selected_choice'] = serializer.validated_data['selected_choice']
        elif question.question_type == 'SA':
            answer_data['answer_text'] = serializer.validated_data['answer_text']
        
        # Use get_or_create to handle duplicate submissions
        answer, created = Answer.objects.get_or_create(
            quiz_attempt=attempt,
            question=question,
            defaults=answer_data
        )
        
        if not created:
            # Update existing answer
            for key, value in answer_data.items():
                if key not in ['quiz_attempt', 'question']:
                    setattr(answer, key, value)
            answer.save()
        
        return Response({
            'message': 'Answer submitted successfully',
            'answer': AnswerSerializer(answer).data
        })
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def submit_quiz_attempt(request):
    """Submit and finalize a quiz attempt"""
    if not request.user.is_student:
        return Response(
            {'error': 'Only students can submit quiz attempts'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    attempt_id = request.data.get('attempt_id')
    if not attempt_id:
        return Response(
            {'error': 'Attempt ID is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        attempt = QuizAttempt.objects.get(
            id=attempt_id,
            student=request.user,
            is_completed=False
        )
    except QuizAttempt.DoesNotExist:
        return Response(
            {'error': 'Quiz attempt not found or already completed'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    with transaction.atomic():
        # Submit the attempt
        attempt.submit_attempt()
    
    # Return quiz results
    serializer = QuizResultSerializer(attempt)
    return Response({
        'message': 'Quiz submitted successfully',
        'result': serializer.data
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def quiz_attempt_detail(request, attempt_id):
    """Get detailed quiz attempt results"""
    try:
        attempt = QuizAttempt.objects.get(id=attempt_id)
    except QuizAttempt.DoesNotExist:
        return Response(
            {'error': 'Quiz attempt not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Check permissions
    if request.user.is_student:
        if attempt.student != request.user:
            return Response(
                {'error': 'You can only view your own attempts'},
                status=status.HTTP_403_FORBIDDEN
            )
    elif request.user.is_lecturer:
        if attempt.quiz.topic.course.lecturer != request.user:
            return Response(
                {'error': 'You can only view attempts for your courses'},
                status=status.HTTP_403_FORBIDDEN
            )
    else:
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    serializer = QuizResultSerializer(attempt)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def available_quizzes(request):
    """Get available quizzes for student"""
    if not request.user.is_student:
        return Response(
            {'error': 'Only students can view available quizzes'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get enrolled courses
    enrolled_courses = CourseEnrollment.objects.filter(
        student=request.user,
        is_active=True
    ).values_list('course_id', flat=True)
    
    # Get quizzes not yet attempted
    attempted_quiz_ids = QuizAttempt.objects.filter(
        student=request.user
    ).values_list('quiz_id', flat=True)
    
    available_quizzes = Quiz.objects.filter(
        topic__course_id__in=enrolled_courses,
        is_active=True
    ).exclude(id__in=attempted_quiz_ids).order_by('-created_at')
    
    # Separate live and regular quizzes
    live_quizzes = available_quizzes.filter(is_live=True)
    regular_quizzes = available_quizzes.filter(is_live=False)
    
    return Response({
        'live_quizzes': AvailableQuizSerializer(
            live_quizzes, many=True, context={'request': request}
        ).data,
        'regular_quizzes': AvailableQuizSerializer(
            regular_quizzes, many=True, context={'request': request}
        ).data
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def my_quiz_attempts(request):
    """Get user's quiz attempts"""
    if not request.user.is_student:
        return Response(
            {'error': 'Only students can view quiz attempts'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    attempts = QuizAttempt.objects.filter(
        student=request.user
    ).order_by('-started_at')
    
    serializer = QuizAttemptSerializer(attempts, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def quiz_statistics(request, quiz_id):
    """Get detailed quiz statistics for lecturers"""
    if not request.user.is_lecturer:
        return Response(
            {'error': 'Only lecturers can view quiz statistics'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        quiz = Quiz.objects.get(id=quiz_id, topic__course__lecturer=request.user)
    except Quiz.DoesNotExist:
        return Response(
            {'error': 'Quiz not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Get comprehensive statistics
    attempts = QuizAttempt.objects.filter(quiz=quiz)
    total_attempts = attempts.count()
    completed_attempts = attempts.filter(is_completed=True)
    completed_count = completed_attempts.count()
    
    # Performance statistics
    if completed_count > 0:
        avg_score = completed_attempts.aggregate(
            avg_score=Avg('score_percentage')
        )['avg_score'] or 0
        
        scores = list(completed_attempts.values_list('score_percentage', flat=True))
        highest_score = max(scores)
        lowest_score = min(scores)
    else:
        avg_score = 0
        highest_score = 0
        lowest_score = 0
    
    # Score distribution
    score_distribution = {
        '0-20': completed_attempts.filter(score_percentage__lt=20).count(),
        '20-40': completed_attempts.filter(score_percentage__gte=20, score_percentage__lt=40).count(),
        '40-60': completed_attempts.filter(score_percentage__gte=40, score_percentage__lt=60).count(),
        '60-80': completed_attempts.filter(score_percentage__gte=60, score_percentage__lt=80).count(),
        '80-100': completed_attempts.filter(score_percentage__gte=80).count(),
    }
    
    # Recent attempts
    recent_attempts = attempts.order_by('-started_at')[:10]
    
    statistics = {
        'quiz_info': QuizSerializer(quiz).data,
        'attempts': {
            'total': total_attempts,
            'completed': completed_count,
            'completion_rate': round((completed_count / total_attempts * 100) if total_attempts > 0 else 0, 2)
        },
        'performance': {
            'average_score': round(avg_score, 2),
            'highest_score': highest_score,
            'lowest_score': lowest_score
        },
        'score_distribution': score_distribution,
        'recent_attempts': QuizAttemptSerializer(recent_attempts, many=True).data
    }
    
    return Response(statistics)