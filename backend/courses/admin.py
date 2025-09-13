from django.contrib import admin
from .models import Course, CourseEnrollment, Topic, Attendance


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
        'get_topics_count',  'is_active', 'created_at'
    )
    list_filter = ('is_active', 'created_at', 'lecturer')
    search_fields = ('code', 'name', 'lecturer__username', 'lecturer__first_name', 'lecturer__last_name')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)
    
    fieldsets = (
        (None, {
            'fields': ('name', 'code', 'description', 'lecturer')
        }),
        ('Settings', {
            'fields': ('max_students', 'is_active')
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


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    """Topic admin"""
    list_display = ('name', 'course', 'get_quizzes_count', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at', 'course')
    search_fields = ('name', 'course__code', 'course__name')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)
    
    def get_quizzes_count(self, obj):
        return obj.get_quizzes_count()
    get_quizzes_count.short_description = 'Quizzes'


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    """Attendance admin"""
    list_display = ('student', 'course', 'date', 'is_present', 'verified_by_quiz', 'created_at')
    list_filter = ('is_present', 'verified_by_quiz', 'date', 'course')
    search_fields = (
        'student__username', 'student__first_name', 'student__last_name',
        'student__student_number', 'course__code', 'course__name'
    )
    readonly_fields = ('created_at',)
    ordering = ('-date', 'course', 'student__first_name')


admin.site.site_header = 'Amandla Course Management'
admin.site.site_title = 'Amandla Admin'
admin.site.index_title = 'Course Engagement System Administration'