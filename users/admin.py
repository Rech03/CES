# users/admin.py - SINGLE USER MODEL ADMIN

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, StudentProfile


class StudentProfileInline(admin.StackedInline):
    """Inline for student profile"""
    model = StudentProfile
    can_delete = False
    verbose_name_plural = 'Student Performance'
    fields = ('total_quizzes_completed', 'total_correct_answers', 'current_streak', 'longest_streak', 'fastest_quiz_time')
    readonly_fields = ('total_quizzes_completed', 'total_correct_answers', 'current_streak', 'longest_streak', 'fastest_quiz_time')


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom User admin"""
    
    list_display = ('username', 'email', 'get_full_name', 'user_type', 'get_identifier', 'is_active', 'date_joined')
    list_filter = ('user_type', 'is_active', 'is_staff', 'date_joined')
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
            'description': 'Only fill this for students'
        }),
        ('Lecturer info', {
            'fields': ('employee_id', 'department'),
            'classes': ('collapse',),
            'description': 'Only fill this for lecturers'
        }),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
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
            'description': 'Fill student_number for students, employee_id+department for lecturers'
        }),
    )
    
    readonly_fields = ('date_joined', 'last_login')
    
    def get_identifier(self, obj):
        """Get student number or employee ID"""
        if obj.user_type == 'student':
            return obj.student_number or 'No student number'
        elif obj.user_type == 'lecturer':
            return obj.employee_id or 'No employee ID'
        return '-'
    get_identifier.short_description = 'ID Number'
    
    def get_inline_instances(self, request, obj=None):
        """Only show student profile inline for students"""
        if obj and obj.user_type == 'student':
            return [StudentProfileInline(self.model, self.admin_site)]
        return []


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    """Student Profile admin"""
    list_display = ('user', 'total_quizzes_completed', 'total_correct_answers', 'current_streak')
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'user__student_number')
    readonly_fields = ('total_quizzes_completed', 'total_correct_answers', 'current_streak', 'longest_streak', 'fastest_quiz_time')
    
    def get_queryset(self, request):
        """Only show profiles for students"""
        return super().get_queryset(request).filter(user__user_type='student')