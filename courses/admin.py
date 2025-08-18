from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import Course, CourseEnrollment, Topic


class CourseEnrollmentInline(admin.TabularInline):
    """Inline for course enrollments"""
    model = CourseEnrollment
    extra = 0
    readonly_fields = ('enrolled_at',)
    fields = ('student', 'is_active', 'enrolled_at')


class TopicInline(admin.StackedInline):
    """Inline for course topics"""
    model = Topic
    extra = 0
    fields = ('name', 'description', 'is_active')


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    """Course admin"""
    list_display = (
        'code', 'name', 'lecturer', 'get_enrolled_count', 
        'get_topics_count', 'enrollment_code', 'is_active', 'created_at'
    )
    list_filter = ('is_active', 'created_at', 'lecturer')
    search_fields = ('code', 'name', 'lecturer__username', 'lecturer__first_name', 'lecturer__last_name')
    readonly_fields = ('enrollment_code', 'created_at', 'updated_at')
    ordering = ('-created_at',)
    
    fieldsets = (
        (None, {
            'fields': ('name', 'code', 'description', 'lecturer')
        }),
        ('Settings', {
            'fields': ('max_students', 'is_active')
        }),
        ('Enrollment', {
            'fields': ('enrollment_code',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    inlines = [TopicInline, CourseEnrollmentInline]
    
    def get_enrolled_count(self, obj):
        return obj.get_enrolled_students_count()
    get_enrolled_count.short_description = 'Enrolled Students'
    
    def get_topics_count(self, obj):
        return obj.get_topics_count()
    get_topics_count.short_description = 'Topics'
    
    actions = ['regenerate_enrollment_codes']
    
    def regenerate_enrollment_codes(self, request, queryset):
        """Regenerate enrollment codes for selected courses"""
        updated = 0
        for course in queryset:
            course.enrollment_code = course.generate_enrollment_code()
            course.save()
            updated += 1
        
        self.message_user(
            request,
            f'Successfully regenerated enrollment codes for {updated} courses.'
        )
    regenerate_enrollment_codes.short_description = 'Regenerate enrollment codes'


@admin.register(CourseEnrollment)
class CourseEnrollmentAdmin(admin.ModelAdmin):
    """Course enrollment admin"""
    list_display = ('student', 'course', 'enrolled_at', 'is_active')
    list_filter = ('is_active', 'enrolled_at', 'course')
    search_fields = (
        'student__username', 'student__first_name', 'student__last_name',
        'student__student_number', 'course__code', 'course__name'
    )
    readonly_fields = ('enrolled_at',)
    ordering = ('-enrolled_at',)
    
    fieldsets = (
        (None, {
            'fields': ('student', 'course', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('enrolled_at',),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['activate_enrollments', 'deactivate_enrollments']
    
    def activate_enrollments(self, request, queryset):
        """Activate selected enrollments"""
        updated = queryset.update(is_active=True)
        self.message_user(
            request,
            f'Successfully activated {updated} enrollments.'
        )
    activate_enrollments.short_description = 'Activate selected enrollments'
    
    def deactivate_enrollments(self, request, queryset):
        """Deactivate selected enrollments"""
        updated = queryset.update(is_active=False)
        self.message_user(
            request,
            f'Successfully deactivated {updated} enrollments.'
        )
    deactivate_enrollments.short_description = 'Deactivate selected enrollments'


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    """Topic admin"""
    list_display = ('name', 'course', 'get_quizzes_count', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at', 'course')
    search_fields = ('name', 'course__code', 'course__name')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)
    
    fieldsets = (
        (None, {
            'fields': ('course', 'name', 'description', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_quizzes_count(self, obj):
        # Will show quiz count when quizzes app is implemented
        return 0
    get_quizzes_count.short_description = 'Quizzes'
    
    actions = ['activate_topics', 'deactivate_topics']
    
    def activate_topics(self, request, queryset):
        """Activate selected topics"""
        updated = queryset.update(is_active=True)
        self.message_user(
            request,
            f'Successfully activated {updated} topics.'
        )
    activate_topics.short_description = 'Activate selected topics'
    
    def deactivate_topics(self, request, queryset):
        """Deactivate selected topics"""
        updated = queryset.update(is_active=False)
        self.message_user(
            request,
            f'Successfully deactivated {updated} topics.'
        )
    deactivate_topics.short_description = 'Deactivate selected topics'


# Custom admin site modifications
admin.site.site_header = 'Amandla Course Management'
admin.site.site_title = 'Amandla Admin'
admin.site.index_title = 'Course Engagement System Administration'