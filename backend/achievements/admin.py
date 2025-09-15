from django.contrib import admin
from django.utils.html import format_html
from .models import BadgeType, StudentAchievement, EarnedBadge, DailyActivity


@admin.register(BadgeType)
class BadgeTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'rarity', 'colored_badge', 'xp_reward', 'is_active']
    list_filter = ['category', 'rarity', 'is_active']
    search_fields = ['name', 'description']
    ordering = ['category', 'rarity', 'name']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'category', 'rarity', 'is_active')
        }),
        ('Visual Design', {
            'fields': ('icon', 'color', 'xp_reward')
        }),
        ('Requirements', {
            'fields': ('required_score', 'required_streak', 'required_quizzes', 'required_perfect_scores'),
            'description': 'Set at least one requirement for the badge to be earnable.'
        })
    )
    
    def colored_badge(self, obj):
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 4px;">{}</span>',
            obj.color,
            obj.name
        )
    colored_badge.short_description = 'Badge Preview'


@admin.register(StudentAchievement)
class StudentAchievementAdmin(admin.ModelAdmin):
    list_display = ['student', 'level', 'total_xp', 'current_streak', 'total_quizzes_completed', 'badges_earned']
    list_filter = ['level', 'current_streak']
    search_fields = ['student__first_name', 'student__last_name', 'student__student_number']
    readonly_fields = ['total_xp', 'level', 'total_quizzes_completed', 'perfect_scores', 'average_score', 'total_study_time']
    ordering = ['-total_xp']
    
    fieldsets = (
        ('Student Information', {
            'fields': ('student',)
        }),
        ('Level & XP', {
            'fields': ('total_xp', 'level', 'xp_to_next_level')
        }),
        ('Streaks', {
            'fields': ('current_streak', 'best_streak', 'last_activity_date')
        }),
        ('Performance Stats', {
            'fields': ('total_quizzes_completed', 'perfect_scores', 'average_score', 'total_study_time', 'badges_earned')
        })
    )


@admin.register(EarnedBadge)
class EarnedBadgeAdmin(admin.ModelAdmin):
    list_display = ['student', 'badge_type', 'earned_at', 'course']
    list_filter = ['badge_type__category', 'badge_type__rarity', 'earned_at', 'course']
    search_fields = ['student__first_name', 'student__last_name', 'badge_type__name']
    date_hierarchy = 'earned_at'
    ordering = ['-earned_at']
    
    def get_readonly_fields(self, request, obj=None):
        if obj:  # Editing existing earned badge
            return ['student', 'badge_type', 'earned_at']
        return []


@admin.register(DailyActivity)
class DailyActivityAdmin(admin.ModelAdmin):
    list_display = ['student', 'date', 'quizzes_completed', 'xp_earned', 'study_time_display']
    list_filter = ['date', 'quizzes_completed']
    search_fields = ['student__first_name', 'student__last_name']
    date_hierarchy = 'date'
    ordering = ['-date']
    
    def study_time_display(self, obj):
        hours = int(obj.study_time.total_seconds() // 3600)
        minutes = int((obj.study_time.total_seconds() % 3600) // 60)
        return f"{hours}h {minutes}m"
    study_time_display.short_description = 'Study Time'


# Custom admin actions
def award_badge_to_students(modeladmin, request, queryset):
    """Custom action to award a badge to selected students"""
    # This would need additional form handling to select badge type
    pass
award_badge_to_students.short_description = "Award badge to selected students"

# Add the action to StudentAchievementAdmin
StudentAchievementAdmin.actions = [award_badge_to_students]