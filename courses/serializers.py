from rest_framework import serializers
from django.utils import timezone
from .models import Course, CourseEnrollment, Topic
from users.serializers import UserSerializer


class CourseSerializer(serializers.ModelSerializer):
    """Course serializer"""
    lecturer_name = serializers.CharField(source='lecturer.get_full_name', read_only=True)
    enrolled_students_count = serializers.SerializerMethodField()
    topics_count = serializers.SerializerMethodField()
    total_quizzes_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Course
        fields = [
            'id', 'name', 'code', 'description', 'lecturer', 'lecturer_name',
            'created_at', 'updated_at', 'is_active', 'enrollment_code',
            'max_students', 'enrolled_students_count', 'topics_count',
            'total_quizzes_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'enrollment_code']
    
    def get_enrolled_students_count(self, obj):
        return obj.get_enrolled_students_count()
    
    def get_topics_count(self, obj):
        return obj.get_topics_count()
    
    def get_total_quizzes_count(self, obj):
        # Will be implemented when quizzes app is ready
        return 0


class CourseCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating courses"""
    
    class Meta:
        model = Course
        fields = ['name', 'code', 'description', 'max_students']
    
    def create(self, validated_data):
        # Set the lecturer from the request user
        validated_data['lecturer'] = self.context['request'].user
        return super().create(validated_data)


class CourseEnrollmentSerializer(serializers.ModelSerializer):
    """Course enrollment serializer"""
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    student_number = serializers.CharField(source='student.student_number', read_only=True)
    course_name = serializers.CharField(source='course.name', read_only=True)
    course_code = serializers.CharField(source='course.code', read_only=True)
    
    class Meta:
        model = CourseEnrollment
        fields = [
            'id', 'student', 'course', 'student_name', 'student_number',
            'course_name', 'course_code', 'enrolled_at', 'is_active'
        ]
        read_only_fields = ['id', 'enrolled_at']


class EnrollStudentSerializer(serializers.Serializer):
    """Serializer for enrolling students"""
    student_number = serializers.CharField(max_length=20)
    enrollment_code = serializers.CharField(max_length=20)
    
    def validate(self, attrs):
        student_number = attrs.get('student_number')
        enrollment_code = attrs.get('enrollment_code')
        
        # Check if student exists
        from users.models import User
        try:
            student = User.objects.get(
                student_number=student_number,
                user_type='student'
            )
        except User.DoesNotExist:
            raise serializers.ValidationError(
                f"Student with number {student_number} does not exist."
            )
        
        # Check if course exists
        try:
            course = Course.objects.get(enrollment_code=enrollment_code)
        except Course.DoesNotExist:
            raise serializers.ValidationError("Invalid enrollment code.")
        
        # Check if already enrolled
        if CourseEnrollment.objects.filter(
            student=student, course=course
        ).exists():
            raise serializers.ValidationError(
                "Student is already enrolled in this course."
            )
        
        # Check course capacity
        if course.get_enrolled_students_count() >= course.max_students:
            raise serializers.ValidationError("Course is at maximum capacity.")
        
        attrs['student'] = student
        attrs['course'] = course
        return attrs


class TopicSerializer(serializers.ModelSerializer):
    """Topic serializer"""
    course_name = serializers.CharField(source='course.name', read_only=True)
    course_code = serializers.CharField(source='course.code', read_only=True)
    quizzes_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Topic
        fields = [
            'id', 'course', 'name', 'description', 'course_name',
            'course_code', 'created_at', 'updated_at', 'is_active',
            'quizzes_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_quizzes_count(self, obj):
        # Will be implemented when quizzes app is ready
        return 0


class CourseDashboardSerializer(serializers.ModelSerializer):
    """Course dashboard data for lecturers"""
    enrolled_students_count = serializers.SerializerMethodField()
    topics_count = serializers.SerializerMethodField()
    total_quizzes = serializers.SerializerMethodField()
    active_quizzes = serializers.SerializerMethodField()
    recent_activity = serializers.SerializerMethodField()
    
    class Meta:
        model = Course
        fields = [
            'id', 'name', 'code', 'enrolled_students_count',
            'topics_count', 'total_quizzes', 'active_quizzes',
            'recent_activity'
        ]
    
    def get_enrolled_students_count(self, obj):
        return obj.get_enrolled_students_count()
    
    def get_topics_count(self, obj):
        return obj.get_topics_count()
    
    def get_total_quizzes(self, obj):
        # Will be implemented when quizzes app is ready
        return 0
    
    def get_active_quizzes(self, obj):
        # Will be implemented when quizzes app is ready
        return 0
    
    def get_recent_activity(self, obj):
        # Will be implemented when quizzes app is ready
        return []


class StudentDashboardSerializer(serializers.Serializer):
    """Student dashboard data"""
    enrolled_courses = serializers.SerializerMethodField()
    performance_summary = serializers.SerializerMethodField()
    
    def get_enrolled_courses(self, obj):
        enrollments = CourseEnrollment.objects.filter(
            student=obj, is_active=True
        ).select_related('course')
        return CourseEnrollmentSerializer(enrollments, many=True).data
    
    def get_performance_summary(self, obj):
        profile = getattr(obj, 'student_profile', None)
        if profile:
            return {
                'total_quizzes': profile.total_quizzes_completed,
                'correct_answers': profile.total_correct_answers,
                'current_streak': profile.current_streak,
                'longest_streak': profile.longest_streak,
                'fastest_time': profile.fastest_quiz_time
            }
        return {}


class EnrollWithCodeSerializer(serializers.Serializer):
    """Serializer for student self-enrollment"""
    enrollment_code = serializers.CharField(max_length=20)
    
    def validate_enrollment_code(self, value):
        try:
            course = Course.objects.get(enrollment_code=value, is_active=True)
        except Course.DoesNotExist:
            raise serializers.ValidationError("Invalid enrollment code.")
        
        # Check course capacity
        if course.get_enrolled_students_count() >= course.max_students:
            raise serializers.ValidationError("Course is at maximum capacity.")
        
        return value