from rest_framework import serializers
from django.utils import timezone
from .models import LiveQASession, LiveQAMessage
from courses.models import Course

class LiveQASessionSerializer(serializers.ModelSerializer):
    """Live Q&A Session serializer"""
    lecturer_name = serializers.CharField(source='lecturer.get_full_name', read_only=True)
    course_name = serializers.CharField(source='course.name', read_only=True)
    course_code = serializers.CharField(source='course.code', read_only=True)
    participants_count = serializers.SerializerMethodField()
    messages_count = serializers.SerializerMethodField()
    duration = serializers.SerializerMethodField()
    
    class Meta:
        model = LiveQASession
        fields = [
            'id', 'course', 'lecturer', 'title', 'session_code', 'status',
            'created_at', 'ended_at', 'lecturer_name', 'course_name', 'course_code',
            'participants_count', 'messages_count', 'duration'
        ]
        read_only_fields = ['id', 'session_code', 'lecturer', 'created_at']
    
    def get_participants_count(self, obj):
        return obj.get_participants_count()
    
    def get_messages_count(self, obj):
        return obj.get_messages_count()
    
    def get_duration(self, obj):
        if obj.ended_at:
            duration = obj.ended_at - obj.created_at
        else:
            duration = timezone.now() - obj.created_at
        
        total_minutes = int(duration.total_seconds() / 60)
        hours = total_minutes // 60
        minutes = total_minutes % 60
        
        if hours > 0:
            return f"{hours}h {minutes}m"
        return f"{minutes}m"

class LiveQASessionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating Live Q&A sessions"""
    
    class Meta:
        model = LiveQASession
        fields = ['course', 'title']
    
    def validate_course(self, value):
        """Ensure lecturer owns the course"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            if value.lecturer != request.user:
                raise serializers.ValidationError("You can only create sessions for your courses")
        return value
    
    def create(self, validated_data):
        validated_data['lecturer'] = self.context['request'].user
        return super().create(validated_data)

class LiveQAMessageSerializer(serializers.ModelSerializer):
    """Live Q&A Message serializer"""
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = LiveQAMessage
        fields = ['id', 'message', 'created_at', 'time_ago']
        read_only_fields = ['id', 'created_at']
    
    def get_time_ago(self, obj):
        """Get human-readable time since message was sent"""
        now = timezone.now()
        diff = now - obj.created_at
        
        if diff.days > 0:
            return f"{diff.days}d ago"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"{hours}h ago"
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            return f"{minutes}m ago"
        else:
            return "Just now"

class SendMessageSerializer(serializers.ModelSerializer):
    """Serializer for sending anonymous messages"""
    
    class Meta:
        model = LiveQAMessage
        fields = ['message']
    
    def validate_message(self, value):
        if len(value.strip()) < 5:
            raise serializers.ValidationError("Message must be at least 5 characters long")
        if len(value) > 500:
            raise serializers.ValidationError("Message cannot exceed 500 characters")
        return value.strip()

class JoinSessionSerializer(serializers.Serializer):
    """Serializer for joining a session"""
    session_code = serializers.CharField(max_length=6)
    
    def validate_session_code(self, value):
        try:
            session = LiveQASession.objects.get(
                session_code=value.upper(),
                status='active'
            )
            return value.upper()
        except LiveQASession.DoesNotExist:
            raise serializers.ValidationError("Invalid or expired session code")