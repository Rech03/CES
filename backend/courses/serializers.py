from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta
from .models import Course, CourseEnrollment, Topic, Attendance


class CourseSerializer(serializers.ModelSerializer):
    """Course serializer"""
    lecturer_name = serializers.CharField(source='lecturer.get_full_name', read_only=True)
    enrolled_students_count = serializers.SerializerMethodField()
    topics_count = serializers.SerializerMethodField()
    total_ai_quizzes_count = serializers.SerializerMethodField()
    
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
        return obj.get_total_ai_quizzes_count()


class CourseCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating courses"""
    
    class Meta:
        model = Course
        fields = ['name', 'code', 'description', 'max_students']
    
    def create(self, validated_data):
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
        return obj.get_quizzes_count()


class CourseDashboardSerializer(serializers.ModelSerializer):
    """Course dashboard data for lecturers"""
    enrolled_students_count = serializers.SerializerMethodField()
    topics_count = serializers.SerializerMethodField()
    total_quizzes = serializers.SerializerMethodField()
    active_quizzes = serializers.SerializerMethodField()
    recent_activity = serializers.SerializerMethodField()
    attendance_rate = serializers.SerializerMethodField()
    
    class Meta:
        model = Course
        fields = [
            'id', 'name', 'code', 'enrolled_students_count',
            'topics_count', 'total_quizzes', 'active_quizzes',
            'recent_activity', 'attendance_rate'
        ]
    
    def get_enrolled_students_count(self, obj):
        return obj.get_enrolled_students_count()
    
    def get_topics_count(self, obj):
        return obj.get_topics_count()
    
    def get_total_quizzes(self, obj):
        return obj.get_total_ai_quizzes_count()
    
    def get_attendance_rate(self, obj):
        total_students = obj.get_enrolled_students_count()
        if total_students == 0:
            return 0
        
        thirty_days_ago = timezone.now().date() - timedelta(days=30)
        attendance_records = Attendance.objects.filter(
            course=obj, date__gte=thirty_days_ago
        )
        
        if not attendance_records.exists():
            return 0
        
        present_count = attendance_records.filter(is_present=True).count()
        total_records = attendance_records.count()
        
        return round((present_count / total_records) * 100, 2) if total_records > 0 else 0


class StudentDashboardSerializer(serializers.Serializer):
    """Student dashboard data"""
    enrolled_courses = serializers.SerializerMethodField()
    performance_summary = serializers.SerializerMethodField()
    attendance_summary = serializers.SerializerMethodField()
    
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
                'fastest_time': str(profile.fastest_quiz_time) if profile.fastest_quiz_time else None
            }
        return {}
    
    def get_attendance_summary(self, obj):
        thirty_days_ago = timezone.now().date() - timedelta(days=30)
        attendance_records = Attendance.objects.filter(
            student=obj, date__gte=thirty_days_ago
        )
        
        total_records = attendance_records.count()
        present_count = attendance_records.filter(is_present=True).count()
        quiz_verified_count = attendance_records.filter(verified_by_quiz=True).count()
        
        return {
            'total_days': total_records,
            'days_present': present_count,
            'attendance_rate': round((present_count / total_records) * 100, 2) if total_records > 0 else 0,
            'quiz_verified_days': quiz_verified_count
        }


class AttendanceSerializer(serializers.ModelSerializer):
    """Attendance serializer"""
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    student_number = serializers.CharField(source='student.student_number', read_only=True)
    course_code = serializers.CharField(source='course.code', read_only=True)
    quiz_title = serializers.CharField(source='quiz_attempt.quiz.title', read_only=True)
    
    class Meta:
        model = Attendance
        fields = [
            'id', 'student', 'course', 'date', 'is_present', 
            'verified_by_quiz', 'quiz_attempt', 'created_at',
            'student_name', 'student_number', 'course_code', 'quiz_title'
        ]
        read_only_fields = ['id', 'created_at']


class BulkStudentUploadSerializer(serializers.Serializer):
    """Serializer for CSV upload validation"""
    csv_file = serializers.FileField()
    
    def validate_csv_file(self, value):
        if not value.name.endswith('.csv'):
            raise serializers.ValidationError("File must be a CSV")
        
        if value.size > 5 * 1024 * 1024:  # 5MB limit
            raise serializers.ValidationError("File too large. Maximum size is 5MB")
        
        return value