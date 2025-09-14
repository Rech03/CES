from rest_framework import serializers
from django.core.exceptions import ValidationError
from .models import LectureSlide, AdaptiveQuiz, StudentAdaptiveProgress, AdaptiveQuizAttempt


class LectureSlideSerializer(serializers.ModelSerializer):
    """Serializer for lecture slides"""
    topic_name = serializers.CharField(source='topic.name', read_only=True)
    course_code = serializers.CharField(source='topic.course.code', read_only=True)
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
    file_size = serializers.SerializerMethodField()
    
    class Meta:
        model = LectureSlide
        fields = [
            'id', 'topic', 'title', 'slide_file', 'extracted_text',
            'uploaded_by', 'topic_name', 'course_code', 'uploaded_by_name',
            'questions_generated', 'file_size', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'extracted_text', 'uploaded_by', 'questions_generated',
            'created_at', 'updated_at'
        ]
    
    def get_file_size(self, obj):
        """Get file size in MB"""
        if obj.slide_file:
            try:
                size_mb = obj.slide_file.size / (1024 * 1024)
                return round(size_mb, 2)
            except:
                return None
        return None
    
    def validate_slide_file(self, value):
        """Validate uploaded file"""
        if value:
            # Check file extension
            if not value.name.lower().endswith('.pdf'):
                raise serializers.ValidationError("Only PDF files are allowed.")
            
            # Check file size (limit to 10MB)
            if value.size > 10 * 1024 * 1024:
                raise serializers.ValidationError("File size must be less than 10MB.")
        
        return value


class AdaptiveQuizSerializer(serializers.ModelSerializer):
    """Serializer for adaptive quizzes"""
    lecture_slide_title = serializers.CharField(source='lecture_slide.title', read_only=True)
    question_count = serializers.SerializerMethodField()
    
    class Meta:
        model = AdaptiveQuiz
        fields = [
            'id', 'lecture_slide', 'lecture_slide_title', 'difficulty',
            'questions_data', 'question_count', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_question_count(self, obj):
        return obj.get_question_count()


class StudentAdaptiveProgressSerializer(serializers.ModelSerializer):
    """Serializer for student progress"""
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    quiz_title = serializers.CharField(source='adaptive_quiz.lecture_slide.title', read_only=True)
    difficulty = serializers.CharField(source='adaptive_quiz.difficulty', read_only=True)
    
    class Meta:
        model = StudentAdaptiveProgress
        fields = [
            'id', 'student', 'student_name', 'adaptive_quiz', 'quiz_title',
            'difficulty', 'attempts_count', 'best_score', 'latest_score',
            'completed', 'unlocked_next_level', 'explanation_viewed',
            'first_attempt_at', 'last_attempt_at', 'completed_at'
        ]
        read_only_fields = [
            'id', 'attempts_count', 'best_score', 'latest_score', 'completed',
            'unlocked_next_level', 'first_attempt_at', 'last_attempt_at', 'completed_at'
        ]


class AdaptiveQuizAttemptSerializer(serializers.ModelSerializer):
    """Serializer for quiz attempts"""
    student_name = serializers.CharField(source='progress.student.get_full_name', read_only=True)
    quiz_title = serializers.CharField(source='progress.adaptive_quiz.lecture_slide.title', read_only=True)
    difficulty = serializers.CharField(source='progress.adaptive_quiz.difficulty', read_only=True)
    
    class Meta:
        model = AdaptiveQuizAttempt
        fields = [
            'id', 'progress', 'student_name', 'quiz_title', 'difficulty',
            'answers_data', 'score_percentage', 'time_taken',
            'started_at', 'completed_at'
        ]
        read_only_fields = ['id', 'started_at', 'completed_at']


class QuizQuestionSerializer(serializers.Serializer):
    """Serializer for individual quiz questions"""
    difficulty = serializers.CharField()
    question = serializers.CharField()
    options = serializers.DictField()
    correct_answer = serializers.CharField()
    explanation = serializers.CharField()


class AdaptiveQuizTakeSerializer(serializers.Serializer):
    """Serializer for taking an adaptive quiz"""
    adaptive_quiz_id = serializers.IntegerField()
    answers = serializers.DictField()
    
    def validate_adaptive_quiz_id(self, value):
        """Validate quiz exists and is accessible"""
        try:
            quiz = AdaptiveQuiz.objects.get(id=value, is_active=True)
            return value
        except AdaptiveQuiz.DoesNotExist:
            raise serializers.ValidationError("Quiz not found or inactive.")
    
    def validate_answers(self, value):
        """Validate answer format"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Answers must be a dictionary.")
        
        # Check that all answers are valid choices (A, B, C, D)
        valid_choices = ['A', 'B', 'C', 'D']
        for key, answer in value.items():
            if answer not in valid_choices:
                raise serializers.ValidationError(f"Invalid answer '{answer}' for {key}. Must be A, B, C, or D.")
        
        return value


class LectureSlideUploadSerializer(serializers.Serializer):
    """Serializer for uploading lecture slides"""
    topic_id = serializers.IntegerField()
    title = serializers.CharField(max_length=200)
    slide_file = serializers.FileField()
    
    def validate_topic_id(self, value):
        """Validate topic exists and lecturer has permission"""
        from courses.models import Topic
        
        try:
            topic = Topic.objects.get(id=value)
            request = self.context.get('request')
            
            if request and request.user != topic.course.lecturer:
                raise serializers.ValidationError("You can only upload slides to your own courses.")
            
            return value
        except Topic.DoesNotExist:
            raise serializers.ValidationError("Topic not found.")
    
    def validate_slide_file(self, value):
        """Validate uploaded file"""
        if not value.name.lower().endswith('.pdf'):
            raise serializers.ValidationError("Only PDF files are allowed.")
        
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("File size must be less than 10MB.")
        
        return value


class StudentQuizAccessSerializer(serializers.Serializer):
    """Serializer for student quiz access information"""
    quiz_id = serializers.IntegerField()
    difficulty = serializers.CharField()
    accessible = serializers.BooleanField()
    status = serializers.CharField()  # 'available', 'completed', 'locked'
    best_score = serializers.FloatField()
    attempts_count = serializers.IntegerField()
    question_count = serializers.IntegerField()


class LectureSlideQuizzesSerializer(serializers.Serializer):
    """Serializer for lecture slide with associated quizzes"""
    slide_id = serializers.IntegerField()
    title = serializers.CharField()
    topic_name = serializers.CharField()
    course_code = serializers.CharField()
    questions_generated = serializers.BooleanField()
    available_quizzes = StudentQuizAccessSerializer(many=True)
    created_at = serializers.DateTimeField()


class GenerateQuestionsSerializer(serializers.Serializer):
    """Serializer for generating questions from slides"""
    lecture_slide_id = serializers.IntegerField()
    
    def validate_lecture_slide_id(self, value):
        """Validate slide exists and user has permission"""
        try:
            slide = LectureSlide.objects.get(id=value)
            request = self.context.get('request')
            
            if request and request.user != slide.uploaded_by:
                raise serializers.ValidationError("You can only generate questions for your own slides.")
            
            if slide.questions_generated:
                raise serializers.ValidationError("Questions have already been generated for this slide.")
            
            return value
        except LectureSlide.DoesNotExist:
            raise serializers.ValidationError("Lecture slide not found.")


class QuizResultSerializer(serializers.Serializer):
    """Serializer for quiz attempt results"""
    score = serializers.FloatField()
    correct_count = serializers.IntegerField()
    total_questions = serializers.IntegerField()
    completed = serializers.BooleanField()
    show_explanation = serializers.BooleanField()
    unlocked_next = serializers.BooleanField()
    explanations = serializers.ListField(required=False)
    
    
class QuizWithProgressSerializer(serializers.Serializer):
    """Combined serializer for quiz and student progress"""
    quiz = AdaptiveQuizSerializer()
    progress = StudentAdaptiveProgressSerializer()
    accessible = serializers.BooleanField()
    status = serializers.CharField()
    questions = serializers.ListField(required=False)