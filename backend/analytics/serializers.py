from rest_framework import serializers
from django.db.models import Avg, Count
from .models import StudentEngagementMetrics, DailyEngagement
from courses.models import Course, Topic


class StudentEngagementSerializer(serializers.ModelSerializer):
    """Serializer for student engagement metrics"""
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    student_number = serializers.CharField(source='student.student_number', read_only=True)
    course_code = serializers.CharField(source='course.code', read_only=True)
    course_name = serializers.CharField(source='course.name', read_only=True)
    
    class Meta:
        model = StudentEngagementMetrics
        fields = [
            'id', 'student', 'student_name', 'student_number', 
            'course', 'course_code', 'course_name',
            'total_quizzes_taken', 'average_quiz_score', 'performance_category',
            'consecutive_missed_quizzes', 'last_quiz_date', 'updated_at'
        ]
        read_only_fields = ['id', 'updated_at']


class StudentPerformanceDistributionSerializer(serializers.Serializer):
    """Serializer for lecturer analytics - student performance distribution"""
    performance_category = serializers.CharField()
    count = serializers.IntegerField()
    percentage = serializers.FloatField()


class QuizAnalyticsSerializer(serializers.Serializer):
    """Serializer for quiz-specific analytics"""
    quiz_id = serializers.IntegerField()
    quiz_title = serializers.CharField()
    total_attempts = serializers.IntegerField()
    average_score = serializers.FloatField()
    completion_rate = serializers.FloatField()


class TopicAnalyticsSerializer(serializers.Serializer):
    """Serializer for topic-specific analytics"""
    topic_id = serializers.IntegerField()
    topic_name = serializers.CharField()
    total_quizzes = serializers.IntegerField()
    average_score = serializers.FloatField()
    total_attempts = serializers.IntegerField()


class CourseAnalyticsSerializer(serializers.Serializer):
    """Serializer for course-wide analytics"""
    course_id = serializers.IntegerField()
    course_code = serializers.CharField()
    course_name = serializers.CharField()
    total_students = serializers.IntegerField()
    total_quizzes = serializers.IntegerField()
    average_score = serializers.FloatField()
    total_attempts = serializers.IntegerField()


class LecturerDashboardSerializer(serializers.Serializer):
    """Main lecturer dashboard data"""
    course_overview = CourseAnalyticsSerializer(many=True)
    student_distribution = StudentPerformanceDistributionSerializer(many=True)
    recent_performance = serializers.DictField()


class StudentQuizPerformanceSerializer(serializers.Serializer):
    """Student's quiz performance for analytics"""
    quiz_id = serializers.IntegerField()
    quiz_title = serializers.CharField()
    score_percentage = serializers.FloatField()
    completed_date = serializers.DateTimeField()
    course_code = serializers.CharField()


class StudentAnalyticsSerializer(serializers.Serializer):
    """Student's personal analytics dashboard"""
    overall_average = serializers.FloatField()
    total_quizzes_taken = serializers.IntegerField()
    performance_trend = serializers.ListField()
    course_averages = serializers.DictField()


class DailyEngagementSerializer(serializers.ModelSerializer):
    """Serializer for daily engagement (heatmap data)"""
    
    class Meta:
        model = DailyEngagement
        fields = ['date', 'engaged', 'quiz_completed']


class EngagementHeatmapSerializer(serializers.Serializer):
    """Serializer for student engagement heatmap"""
    year = serializers.IntegerField()
    month = serializers.IntegerField()
    engagement_data = serializers.ListField(
        child=serializers.DictField()
    )


class BarChartDataSerializer(serializers.Serializer):
    """Generic serializer for bar chart data"""
    label = serializers.CharField()
    value = serializers.FloatField()
    category = serializers.CharField(required=False)
    color = serializers.CharField(required=False)


class LecturerAnalyticsChoicesSerializer(serializers.Serializer):
    """Serializer for lecturer analytics dropdown choices"""
    chart_type = serializers.ChoiceField(choices=[
        ('quiz', 'Quiz Performance'),
        ('topic', 'Topic Performance'), 
        ('course', 'Course Performance'),
        ('student_distribution', 'Student Performance Distribution')
    ])
    target_id = serializers.IntegerField(required=False)  # quiz_id, topic_id, or course_id
    
    def validate(self, attrs):
        chart_type = attrs.get('chart_type')
        target_id = attrs.get('target_id')
        
        if chart_type in ['quiz', 'topic', 'course'] and not target_id:
            raise serializers.ValidationError(
                f"target_id is required for {chart_type} analytics"
            )
        
        return attrs