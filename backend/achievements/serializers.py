from rest_framework import serializers
from .models import StudentAchievement, BadgeType, EarnedBadge, DailyActivity


class BadgeTypeSerializer(serializers.ModelSerializer):
    """Serializer for badge types"""
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    rarity_display = serializers.CharField(source='get_rarity_display', read_only=True)
    
    class Meta:
        model = BadgeType
        fields = [
            'id', 'name', 'description', 'category', 'category_display',
            'rarity', 'rarity_display', 'icon', 'color', 'xp_reward',
            'required_score', 'required_streak', 'required_quizzes',
            'required_perfect_scores', 'is_active'
        ]


class EarnedBadgeSerializer(serializers.ModelSerializer):
    """Serializer for earned badges"""
    badge_name = serializers.CharField(source='badge_type.name', read_only=True)
    badge_description = serializers.CharField(source='badge_type.description', read_only=True)
    badge_icon = serializers.CharField(source='badge_type.icon', read_only=True)
    badge_color = serializers.CharField(source='badge_type.color', read_only=True)
    badge_rarity = serializers.CharField(source='badge_type.rarity', read_only=True)
    xp_reward = serializers.IntegerField(source='badge_type.xp_reward', read_only=True)
    course_code = serializers.CharField(source='course.code', read_only=True)
    
    class Meta:
        model = EarnedBadge
        fields = [
            'id', 'badge_name', 'badge_description', 'badge_icon',
            'badge_color', 'badge_rarity', 'xp_reward', 'earned_at',
            'course_code'
        ]


class StudentAchievementSerializer(serializers.ModelSerializer):
    """Serializer for student achievement overview"""
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    student_number = serializers.CharField(source='student.student_number', read_only=True)
    study_time_hours = serializers.SerializerMethodField()
    level_progress = serializers.SerializerMethodField()
    
    class Meta:
        model = StudentAchievement
        fields = [
            'student_name', 'student_number', 'total_xp', 'level',
            'xp_to_next_level', 'current_streak', 'best_streak',
            'total_quizzes_completed', 'perfect_scores', 'average_score',
            'study_time_hours', 'badges_earned', 'level_progress',
            'last_activity_date', 'updated_at'
        ]
    
    def get_study_time_hours(self, obj):
        """Convert study time to hours"""
        return round(obj.total_study_time.total_seconds() / 3600, 1)
    
    def get_level_progress(self, obj):
        """Calculate progress to next level as percentage"""
        if obj.level == 1:
            current_level_xp = obj.total_xp
        else:
            current_level_xp = obj.total_xp - ((obj.level - 1) * 1000)
        
        progress_percent = (current_level_xp / 1000) * 100
        return min(progress_percent, 100)


class DailyActivitySerializer(serializers.ModelSerializer):
    """Serializer for daily activity tracking"""
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    study_time_minutes = serializers.SerializerMethodField()
    
    class Meta:
        model = DailyActivity
        fields = [
            'student_name', 'date', 'quizzes_completed',
            'xp_earned', 'study_time_minutes'
        ]
    
    def get_study_time_minutes(self, obj):
        """Convert study time to minutes"""
        return int(obj.study_time.total_seconds() / 60)


class AchievementDashboardSerializer(serializers.Serializer):
    """Serializer for achievement dashboard data"""
    achievement_overview = StudentAchievementSerializer()
    recent_achievements = serializers.ListField(child=serializers.DictField())
    streak_info = serializers.DictField()
    performance_stats = serializers.DictField()
    total_badges = serializers.IntegerField()


class BadgeCollectionSerializer(serializers.Serializer):
    """Serializer for badge collection page"""
    badges = serializers.ListField(child=serializers.DictField())
    rarity_counts = serializers.DictField()
    filter_applied = serializers.CharField()


class BadgeProgressSerializer(serializers.Serializer):
    """Serializer for badge progress tracking"""
    badge_id = serializers.IntegerField()
    badge_name = serializers.CharField()
    current_progress = serializers.FloatField()
    required_value = serializers.FloatField()
    progress_percentage = serializers.FloatField()
    is_completed = serializers.BooleanField()
    description = serializers.CharField()


class LeaderboardEntrySerializer(serializers.Serializer):
    """Serializer for leaderboard entries"""
    rank = serializers.IntegerField()
    student_name = serializers.CharField()
    student_number = serializers.CharField()
    level = serializers.IntegerField()
    total_xp = serializers.IntegerField()
    badges_earned = serializers.IntegerField()
    current_streak = serializers.IntegerField()
    average_score = serializers.FloatField()


class CreateBadgeTypeSerializer(serializers.ModelSerializer):
    """Serializer for creating new badge types (admin use)"""
    
    class Meta:
        model = BadgeType
        fields = [
            'name', 'description', 'category', 'rarity', 'icon',
            'color', 'xp_reward', 'required_score', 'required_streak',
            'required_quizzes', 'required_perfect_scores'
        ]
    
    def validate(self, data):
        """Validate badge requirements"""
        category = data.get('category')
        
        # Ensure at least one requirement is set
        requirements = [
            data.get('required_score'),
            data.get('required_streak'),
            data.get('required_quizzes'),
            data.get('required_perfect_scores')
        ]
        
        if not any(req is not None for req in requirements):
            raise serializers.ValidationError(
                "At least one requirement must be specified for the badge."
            )
        
        # Validate category-specific requirements
        if category == 'performance' and not data.get('required_score'):
            raise serializers.ValidationError(
                "Performance badges must have a required_score."
            )
        
        if category == 'streak' and not data.get('required_streak'):
            raise serializers.ValidationError(
                "Streak badges must have a required_streak."
            )
        
        return data


class AchievementStatsSerializer(serializers.Serializer):
    """Serializer for detailed achievement statistics"""
    achievement_overview = StudentAchievementSerializer()
    badge_statistics = serializers.DictField()
    weekly_activity = serializers.DictField()