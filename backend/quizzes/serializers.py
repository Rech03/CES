from rest_framework import serializers
from django.utils import timezone
from .models import Quiz, Question, Choice, QuizAttempt, Answer
from courses.models import CourseEnrollment

class ChoiceSerializer(serializers.ModelSerializer):
    """Choice serializer"""
    
    class Meta:
        model = Choice
        fields = ['id', 'choice_text', 'is_correct', 'order']


class QuestionSerializer(serializers.ModelSerializer):
    """Question serializer"""
    choices = ChoiceSerializer(many=True, read_only=True)
    choices_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Question
        fields = [
            'id', 'quiz', 'question_text', 'question_type', 'points',
            'order', 'correct_answer_text', 'choices', 'choices_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_choices_count(self, obj):
        return obj.get_choices_count()


class QuestionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating questions with choices"""
    choices = ChoiceSerializer(many=True, required=False)
    
    class Meta:
        model = Question
        fields = [
            'question_text', 'question_type', 'points', 'order',
            'correct_answer_text', 'choices'
        ]
    
    def create(self, validated_data):
        choices_data = validated_data.pop('choices', [])
        question = Question.objects.create(**validated_data)
        
        for choice_data in choices_data:
            Choice.objects.create(question=question, **choice_data)
        
        return question


class QuizSerializer(serializers.ModelSerializer):
    """Quiz serializer"""
    topic_name = serializers.CharField(source='topic.name', read_only=True)
    course_name = serializers.CharField(source='topic.course.name', read_only=True)
    course_code = serializers.CharField(source='topic.course.code', read_only=True)
    questions_count = serializers.SerializerMethodField()
    attempts_count = serializers.SerializerMethodField()
    duration_display = serializers.SerializerMethodField()
    
    class Meta:
        model = Quiz
        fields = [
            'id', 'topic', 'title', 'description', 'time_limit', 'total_points',
            'is_graded', 'show_results_immediately', 'is_active', 'created_at',
            'updated_at', 'quiz_password', 'is_live', 'started_at',
            'topic_name', 'course_name', 'course_code', 'questions_count',
            'attempts_count', 'duration_display'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'total_points',
            'quiz_password', 'is_live', 'started_at'
        ]
    
    def get_questions_count(self, obj):
        return obj.get_questions_count()
    
    def get_attempts_count(self, obj):
        return obj.get_attempts_count()
    
    def get_duration_display(self, obj):
        if obj.time_limit:
            total_seconds = int(obj.time_limit.total_seconds())
            minutes = total_seconds // 60
            seconds = total_seconds % 60
            return f"{minutes}:{seconds:02d}"
        return None


class LiveQuizSerializer(serializers.Serializer):
    """Serializer for starting/stopping live quizzes"""
    password = serializers.CharField(max_length=50, required=False)
    action = serializers.ChoiceField(choices=['start', 'stop'])
    
    def validate(self, attrs):
        action = attrs.get('action')
        password = attrs.get('password')
        
        if action == 'start' and not password:
            raise serializers.ValidationError("Password is required to start a live quiz.")
        
        return attrs


class AnswerSerializer(serializers.ModelSerializer):
    """Answer serializer"""
    question_text = serializers.CharField(source='question.question_text', read_only=True)
    question_type = serializers.CharField(source='question.question_type', read_only=True)
    choice_text = serializers.CharField(source='selected_choice.choice_text', read_only=True)
    correct_choice_text = serializers.SerializerMethodField()
    
    class Meta:
        model = Answer
        fields = [
            'id', 'question', 'selected_choice', 'answer_text',
            'is_correct', 'points_earned', 'question_text',
            'question_type', 'choice_text', 'correct_choice_text',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'is_correct', 'points_earned', 'created_at', 'updated_at'
        ]
    
    def get_correct_choice_text(self, obj):
        if obj.question.question_type in ['MCQ', 'TF']:
            correct_choice = obj.question.get_correct_choice()
            return correct_choice.choice_text if correct_choice else None
        return obj.question.correct_answer_text


class QuizAttemptSerializer(serializers.ModelSerializer):
    """Quiz attempt serializer"""
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    student_number = serializers.CharField(source='student.student_number', read_only=True)
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    course_code = serializers.CharField(source='quiz.topic.course.code', read_only=True)
    duration_display = serializers.SerializerMethodField()
    
    class Meta:
        model = QuizAttempt
        fields = [
            'id', 'student', 'quiz', 'student_name', 'student_number',
            'quiz_title', 'course_code', 'started_at', 'completed_at',
            'is_completed', 'is_submitted', 'score_points',
            'score_percentage', 'password_used', 'duration_display'
        ]
        read_only_fields = [
            'id', 'started_at', 'completed_at', 'is_completed',
            'is_submitted', 'score_points', 'score_percentage'
        ]
    
    def get_duration_display(self, obj):
        duration = obj.get_duration()
        if duration:
            total_seconds = int(duration.total_seconds())
            minutes = total_seconds // 60
            seconds = total_seconds % 60
            return f"{minutes}:{seconds:02d}"
        return None


class StartQuizAttemptSerializer(serializers.Serializer):
    """Serializer for starting a quiz attempt"""
    quiz_id = serializers.IntegerField()
    password = serializers.CharField(max_length=50, required=False)
    
    def validate(self, attrs):
        quiz_id = attrs.get('quiz_id')
        password = attrs.get('password')
        
        try:
            quiz = Quiz.objects.get(id=quiz_id, is_active=True)
        except Quiz.DoesNotExist:
            raise serializers.ValidationError("Quiz not found or inactive.")
        
        # Check if quiz is live and password is required
        if quiz.is_live and quiz.quiz_password:
            if not password or password != quiz.quiz_password:
                raise serializers.ValidationError("Invalid quiz password.")
        
        # Check if student is enrolled in the course
        student = self.context['request'].user
        if not CourseEnrollment.objects.filter(
            student=student,
            course=quiz.topic.course,
            is_active=True
        ).exists():
            raise serializers.ValidationError(
                "You must be enrolled in this course to take the quiz."
            )
        
        # Check if student already has an attempt
        if QuizAttempt.objects.filter(student=student, quiz=quiz).exists():
            raise serializers.ValidationError(
                "You have already attempted this quiz."
            )
        
        attrs['quiz'] = quiz
        return attrs


class SubmitAnswerSerializer(serializers.Serializer):
    """Serializer for submitting quiz answers"""
    question_id = serializers.IntegerField()
    selected_choice_id = serializers.IntegerField(required=False)
    answer_text = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, attrs):
        question_id = attrs.get('question_id')
        selected_choice_id = attrs.get('selected_choice_id')
        answer_text = attrs.get('answer_text')
        
        try:
            question = Question.objects.get(id=question_id)
        except Question.DoesNotExist:
            raise serializers.ValidationError("Question not found.")
        
        # Validate based on question type
        if question.question_type in ['MCQ', 'TF']:
            if not selected_choice_id:
                raise serializers.ValidationError(
                    "Selected choice is required for multiple choice questions."
                )
            try:
                choice = Choice.objects.get(id=selected_choice_id, question=question)
                attrs['selected_choice'] = choice
            except Choice.DoesNotExist:
                raise serializers.ValidationError("Invalid choice for this question.")
        
        elif question.question_type == 'SA':
            if not answer_text:
                raise serializers.ValidationError(
                    "Answer text is required for short answer questions."
                )
        
        attrs['question'] = question
        return attrs


class QuizResultSerializer(serializers.ModelSerializer):
    """Quiz result serializer for showing results after completion"""
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    total_questions = serializers.SerializerMethodField()
    correct_answers = serializers.SerializerMethodField()
    wrong_answers = serializers.SerializerMethodField()
    answers_detail = serializers.SerializerMethodField()
    
    class Meta:
        model = QuizAttempt
        fields = [
            'id', 'quiz_title', 'score_points', 'score_percentage',
            'started_at', 'completed_at', 'total_questions',
            'correct_answers', 'wrong_answers', 'answers_detail'
        ]
    
    def get_total_questions(self, obj):
        return obj.quiz.questions.count()
    
    def get_correct_answers(self, obj):
        return obj.answers.filter(is_correct=True).count()
    
    def get_wrong_answers(self, obj):
        return obj.answers.filter(is_correct=False).count()
    
    def get_answers_detail(self, obj):
        if obj.quiz.show_results_immediately:
            return AnswerSerializer(obj.answers.all(), many=True).data
        return []


class AvailableQuizSerializer(serializers.ModelSerializer):
    """Serializer for available quizzes (student view)"""
    topic_name = serializers.CharField(source='topic.name', read_only=True)
    course_name = serializers.CharField(source='topic.course.name', read_only=True)
    course_code = serializers.CharField(source='topic.course.code', read_only=True)
    questions_count = serializers.SerializerMethodField()
    is_attempted = serializers.SerializerMethodField()
    
    class Meta:
        model = Quiz
        fields = [
            'id', 'title', 'description', 'time_limit', 'total_points',
            'is_live', 'topic_name', 'course_name', 'course_code',
            'questions_count', 'is_attempted', 'created_at'
        ]
    
    def get_questions_count(self, obj):
        return obj.get_questions_count()
    
    def get_is_attempted(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return QuizAttempt.objects.filter(
                student=request.user,
                quiz=obj
            ).exists()
        return False