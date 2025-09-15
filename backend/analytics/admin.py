from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Count
from django.contrib import messages
from .models import StudentEngagementMetrics, DailyEngagement


@admin.register(StudentEngagementMetrics)
class StudentEngagementMetricsAdmin(admin.ModelAdmin):
    """Admin interface for student engagement metrics"""
    
    list_display = (
        'student_name', 'student_number', 'course_code', 'performance_category_badge',
        'average_quiz_score', 'total_quizzes_taken', 'consecutive_missed_quizzes',
        'last_quiz_date', 'intervention_status'
    )
    
    list_filter = (
        'performance_category', 'course', 'intervention_email_sent',
        'created_at', 'updated_at'
    )
    
    search_fields = (
        'student__username', 'student__first_name', 'student__last_name',
        'student__student_number', 'course__code', 'course__name'
    )
    
    readonly_fields = (
        'total_quizzes_taken', 'total_quiz_score', 'average_quiz_score',
        'performance_category', 'consecutive_missed_quizzes', 'last_quiz_date',
        'created_at', 'updated_at'
    )
    
    ordering = ('-average_quiz_score', 'performance_category')
    
    fieldsets = (
        ('Student Information', {
            'fields': ('student', 'course')
        }),
        ('Performance Metrics', {
            'fields': (
                'total_quizzes_taken', 'total_quiz_score', 'average_quiz_score',
                'performance_category'
            ),
            'classes': ('collapse',)
        }),
        ('Engagement Tracking', {
            'fields': (
                'consecutive_missed_quizzes', 'last_quiz_date',
                'intervention_email_sent'
            ),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def student_name(self, obj):
        return obj.student.get_full_name()
    student_name.short_description = 'Student Name'
    
    def student_number(self, obj):
        return obj.student.student_number
    student_number.short_description = 'Student Number'
    
    def course_code(self, obj):
        return obj.course.code
    course_code.short_description = 'Course'
    
    def performance_category_badge(self, obj):
        colors = {
            'danger': '#dc3545',
            'good': '#ffc107',
            'excellent': '#28a745'
        }
        color = colors.get(obj.performance_category, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; '
            'border-radius: 4px; font-size: 11px; font-weight: bold;">{}</span>',
            color,
            obj.get_performance_category_display()
        )
    performance_category_badge.short_description = 'Performance'
    performance_category_badge.admin_order_field = 'performance_category'
    
    def intervention_status(self, obj):
        if obj.intervention_email_sent:
            return format_html(
                '<span style="color: #dc3545; font-weight: bold;">📧 Email Sent</span>'
            )
        elif obj.consecutive_missed_quizzes >= 3:
            return format_html(
                '<span style="color: #ffc107; font-weight: bold;">⚠️ Needs Attention</span>'
            )
        else:
            return format_html(
                '<span style="color: #28a745;">✅ Good</span>'
            )
    intervention_status.short_description = 'Intervention Status'
    
    actions = ['refresh_metrics', 'send_intervention_emails', 'reset_intervention_status']
    
    def refresh_metrics(self, request, queryset):
        """Refresh metrics for selected students"""
        updated_count = 0
        for metrics in queryset:
            metrics.calculate_metrics()
            updated_count += 1
        
        self.message_user(
            request,
            f'Successfully refreshed metrics for {updated_count} students.'
        )
    refresh_metrics.short_description = 'Refresh selected metrics'
    
    def send_intervention_emails(self, request, queryset):
        """Send intervention emails to students who need them"""
        email_count = 0
        for metrics in queryset:
            if metrics.consecutive_missed_quizzes >= 3 and not metrics.intervention_email_sent:
                metrics.send_intervention_email()
                email_count += 1
        
        self.message_user(
            request,
            f'Sent intervention emails to {email_count} students.'
        )
    send_intervention_emails.short_description = 'Send intervention emails'
    
    def reset_intervention_status(self, request, queryset):
        """Reset intervention email status"""
        updated = queryset.update(intervention_email_sent=False)
        self.message_user(
            request,
            f'Reset intervention status for {updated} students.'
        )
    reset_intervention_status.short_description = 'Reset intervention status'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'student', 'course'
        )


@admin.register(DailyEngagement)
class DailyEngagementAdmin(admin.ModelAdmin):
    """Admin interface for daily engagement tracking"""
    
    list_display = (
        'student_name', 'student_number', 'date', 'engagement_status',
        'quiz_completed_status'
    )
    
    list_filter = (
        'engaged', 'quiz_completed', 'date', 'student__student_number'
    )
    
    search_fields = (
        'student__username', 'student__first_name', 'student__last_name',
        'student__student_number'
    )
    
    readonly_fields = ('engaged', 'quiz_completed')
    
    ordering = ('-date', 'student__student_number')
    
    date_hierarchy = 'date'
    
    def student_name(self, obj):
        return obj.student.get_full_name()
    student_name.short_description = 'Student Name'
    
    def student_number(self, obj):
        return obj.student.student_number
    student_number.short_description = 'Student Number'
    
    def engagement_status(self, obj):
        if obj.engaged:
            return format_html(
                '<span style="color: #28a745; font-weight: bold;">✅ Engaged</span>'
            )
        else:
            return format_html(
                '<span style="color: #dc3545; font-weight: bold;">❌ Not Engaged</span>'
            )
    engagement_status.short_description = 'Engagement'
    engagement_status.admin_order_field = 'engaged'
    
    def quiz_completed_status(self, obj):
        if obj.quiz_completed:
            return format_html(
                '<span style="color: #28a745; font-weight: bold;">📝 Quiz Done</span>'
            )
        else:
            return format_html(
                '<span style="color: #6c757d;">➖ No Quiz</span>'
            )
    quiz_completed_status.short_description = 'Quiz Status'
    quiz_completed_status.admin_order_field = 'quiz_completed'
    
    actions = ['mark_as_engaged', 'mark_as_not_engaged']
    
    def mark_as_engaged(self, request, queryset):
        """Mark selected days as engaged"""
        updated = queryset.update(engaged=True, quiz_completed=True)
        self.message_user(
            request,
            f'Marked {updated} days as engaged.'
        )
    mark_as_engaged.short_description = 'Mark as engaged'
    
    def mark_as_not_engaged(self, request, queryset):
        """Mark selected days as not engaged"""
        updated = queryset.update(engaged=False, quiz_completed=False)
        self.message_user(
            request,
            f'Marked {updated} days as not engaged.'
        )
    mark_as_not_engaged.short_description = 'Mark as not engaged'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('student')


# Customize admin site headers
admin.site.site_header = 'CES Analytics Dashboard'
admin.site.site_title = 'CES Admin'
admin.site.index_title = 'Course Engagement System Administration'