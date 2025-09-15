from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, StudentProfile


class StudentProfileInline(admin.StackedInline):
    """Inline for student profile"""
    model = StudentProfile
    can_delete = False
    verbose_name_plural = 'Student Performance'
    readonly_fields = ('total_quizzes_completed', 'total_correct_answers', 'current_streak', 'longest_streak', 'fastest_quiz_time')


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom User admin"""
    
    list_display = ('username', 'email', 'get_full_name', 'user_type', 'get_identifier', 'is_active', 'date_joined')
    list_filter = ('user_type', 'is_active', 'date_joined')
    search_fields = ('username', 'email', 'first_name', 'last_name', 'student_number', 'employee_id')
    ordering = ('-date_joined',)
    
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {
            'fields': ('first_name', 'last_name', 'email', 'profile_picture')
        }),
        ('User type', {
            'fields': ('user_type',)
        }),
        ('Student info', {
            'fields': ('student_number',),
            'classes': ('collapse',),
        }),
        ('Lecturer info', {
            'fields': ('employee_id', 'department'),
            'classes': ('collapse',),
        }),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser'),
        }),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2'),
        }),
        ('Personal info', {
            'classes': ('wide',),
            'fields': ('first_name', 'last_name', 'user_type'),
        }),
        ('Type-specific info', {
            'classes': ('wide',),
            'fields': ('student_number', 'employee_id', 'department'),
        }),
    )
    
    readonly_fields = ('date_joined', 'last_login')
    
    def get_identifier(self, obj):
        if obj.user_type == 'student':
            return obj.student_number or 'No student number'
        elif obj.user_type == 'lecturer':
            return obj.employee_id or 'No employee ID'
        elif obj.user_type == 'admin':
            return 'Administrator'
        return '-'
    get_identifier.short_description = 'ID Number'
    
    def get_inline_instances(self, request, obj=None):
        if obj and obj.user_type == 'student':
            return [StudentProfileInline(self.model, self.admin_site)]
        return []


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    """Admin for StudentProfile model"""
    list_display = ('user', 'total_quizzes_completed', 'total_correct_answers', 'current_streak', 'longest_streak')
    list_filter = ('current_streak', 'longest_streak')
    search_fields = ('user__username', 'user__email', 'user__first_name', 'user__last_name')
    readonly_fields = ('user',)  