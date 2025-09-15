from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, StudentProfile


class UserSerializer(serializers.ModelSerializer):
    """User serializer"""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'user_type', 'profile_picture', 'is_active', 'date_joined',
            'student_number', 'employee_id', 'department'
        ]
        read_only_fields = ['id', 'date_joined', 'full_name']


class StudentProfileSerializer(serializers.ModelSerializer):
    """Student Profile serializer"""
    
    class Meta:
        model = StudentProfile
        fields = [
            'total_quizzes_completed', 'total_correct_answers', 'fastest_quiz_time',
            'current_streak', 'longest_streak'
        ]
        read_only_fields = [
            'total_quizzes_completed', 'total_correct_answers', 'fastest_quiz_time',
            'current_streak', 'longest_streak'
        ]


class StudentSerializer(serializers.ModelSerializer):
    """Student-specific serializer"""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    profile = serializers.SerializerMethodField()
    courses_count = serializers.SerializerMethodField()
    profile_picture_url = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'student_number', 'profile_picture', 'profile_picture_url', 'is_active', 'date_joined',
            'profile', 'courses_count'
        ]
        read_only_fields = ['id', 'date_joined', 'full_name', 'profile', 'courses_count', 'profile_picture_url']
    
    def get_profile_picture_url(self, obj):
        """Return profile picture URL or default student avatar"""
        if obj.profile_picture and hasattr(obj.profile_picture, 'url'):
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        return '/static/images/default_student_avatar.png'
    
    def get_profile(self, obj):
        if hasattr(obj, 'student_profile'):
            return StudentProfileSerializer(obj.student_profile).data
        return None
    
    def get_courses_count(self, obj):
        return obj.get_enrolled_courses().count()


class LecturerSerializer(serializers.ModelSerializer):
    """Lecturer-specific serializer"""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    profile_picture_url = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'employee_id', 'department', 'profile_picture', 'profile_picture_url', 'is_active', 'date_joined'
        ]
        read_only_fields = ['id', 'date_joined', 'full_name', 'profile_picture_url']
    
    def get_profile_picture_url(self, obj):
        """Return profile picture URL or default lecturer avatar"""
        if obj.profile_picture and hasattr(obj.profile_picture, 'url'):
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        return '/static/images/default_lecturer_avatar.png'


class AdminSerializer(serializers.ModelSerializer):
    """Admin-specific serializer"""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    profile_picture_url = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'profile_picture', 'profile_picture_url', 'is_active', 'date_joined', 'is_staff', 'is_superuser'
        ]
        read_only_fields = ['id', 'date_joined', 'full_name', 'is_staff', 'is_superuser', 'profile_picture_url']
    
    def get_profile_picture_url(self, obj):
        """Return profile picture URL or default admin avatar"""
        if obj.profile_picture and hasattr(obj.profile_picture, 'url'):
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        return '/static/images/default_admin_avatar.png'


class LoginSerializer(serializers.Serializer):
    """Login serializer"""
    username = serializers.CharField()
    password = serializers.CharField(style={'input_type': 'password'})
    remember_me = serializers.BooleanField(default=False)
    
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        
        if username and password:
            # Try to authenticate with username first
            user = authenticate(username=username, password=password)
            
            # If that fails, try with email
            if not user:
                try:
                    user_obj = User.objects.get(email=username)
                    user = authenticate(username=user_obj.username, password=password)
                except User.DoesNotExist:
                    pass
            
            if user:
                if not user.is_active:
                    raise serializers.ValidationError('User account is disabled.')
                
                attrs['user'] = user
                return attrs
            else:
                raise serializers.ValidationError('Unable to log in with provided credentials.')
        else:
            raise serializers.ValidationError('Must include username/email and password.')


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """Update user profile"""
    
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'profile_picture']


class ChangePasswordSerializer(serializers.Serializer):
    """Change password"""
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)
    confirm_password = serializers.CharField(required=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError("New passwords don't match.")
        return attrs
    
    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value