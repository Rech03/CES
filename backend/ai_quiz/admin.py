from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from django.db.models import Count, Avg, Sum
from django.contrib import messages
from .models import LectureSlide, AdaptiveQuiz, StudentAdaptiveProgress, AdaptiveQuizAttempt


@admin.register(LectureSlide)
class LectureSlideAdmin(admin.ModelAdmin):
    """Admin interface for lecture slides"""
    
    list_display = (
        'title', 'topic_course', 'uploaded_by_name', 'questions_generated',
        'quiz_count', 'created_at'
    )
    
    list_filter = (
        'questions_generated', 'topic__course', 'uploaded_by', 'created_at'
    )
    
    search_fields = (
        'title', 'topic__name', 'topic__course__code', 'uploaded_by__first_name',
        'uploaded_by__last_name'
    )
    
    readonly_fields = ('extracted_text', 'questions_generated', 'created_at', 'updated_at')
    
    ordering = ('-created_at',)
    
    def topic_course(self, obj):
        return f"{obj.topic.course.code} - {obj.topic.name}"
    topic_course.short_description = 'Course & Topic'
    
    def uploaded_by_name(self, obj):
        return obj.uploaded_by.get_full_name()
    uploaded_by_name.short_description = 'Uploaded By'
    
    def quiz_count(self, obj):
        return obj.adaptive_quizzes.count()
    quiz_count.short_description = 'Quizzes'


@admin.register(AdaptiveQuiz)
class AdaptiveQuizAdmin(admin.ModelAdmin):
    """Admin interface for adaptive quizzes"""
    
    list_display = (
        'lecture_slide_title', 'course_code', 'difficulty', 'status',
        'question_count', 'is_active', 'created_at'
    )
    
    list_filter = (
        'difficulty', 'status', 'is_active', 'created_at', 
        'lecture_slide__topic__course'
    )
    
    search_fields = (
        'lecture_slide__title', 'lecture_slide__topic__course__code'
    )
    
    readonly_fields = ('created_at', 'reviewed_at')
    
    ordering = ('lecture_slide', 'difficulty')
    
    fieldsets = (
        ('Quiz Information', {
            'fields': ('lecture_slide', 'difficulty', 'is_active')
        }),
        ('Moderation', {
            'fields': ('status', 'reviewed_by', 'review_notes', 'reviewed_at')
        }),
        ('Questions Data', {
            'fields': ('questions_data',),
            'classes': ('collapse',)
        }),
    )
    
    # Add admin actions for bulk operations
    actions = ['publish_quizzes', 'mark_under_review', 'mark_as_draft']
    
    def lecture_slide_title(self, obj):
        return obj.lecture_slide.title
    lecture_slide_title.short_description = 'Lecture Slide'
    
    def course_code(self, obj):
        return obj.lecture_slide.topic.course.code
    course_code.short_description = 'Course'
    
    def question_count(self, obj):
        return obj.get_question_count()
    question_count.short_description = 'Questions'
    
    def publish_quizzes(self, request, queryset):
        """Publish selected quizzes"""
        updated = queryset.update(
            status='published',
            reviewed_by=request.user,
            reviewed_at=timezone.now()
        )
        self.message_user(request, f'Published {updated} quizzes.')
    publish_quizzes.short_description = 'Publish selected quizzes'
    
    def mark_under_review(self, request, queryset):
        """Mark selected quizzes as under review"""
        updated = queryset.update(status='under_review')
        self.message_user(request, f'Marked {updated} quizzes as under review.')
    mark_under_review.short_description = 'Mark as under review'
    
    def mark_as_draft(self, request, queryset):
        """Mark selected quizzes as draft"""
        updated = queryset.update(status='draft')
        self.message_user(request, f'Marked {updated} quizzes as draft.')
    mark_as_draft.short_description = 'Mark as draft'


@admin.register(StudentAdaptiveProgress)
class StudentAdaptiveProgressAdmin(admin.ModelAdmin):
    """Admin interface for student adaptive progress"""
    
    list_display = (
        'student_name', 'student_number', 'quiz_info', 'difficulty', 
        'completed', 'best_score', 'attempts_count', 'last_attempt_at'
    )
    
    list_filter = (
        'completed', 'adaptive_quiz__difficulty', 'unlocked_next_level',
        'adaptive_quiz__lecture_slide__topic__course', 'last_attempt_at'
    )
    
    search_fields = (
        'student__username', 'student__first_name', 'student__last_name',
        'student__student_number', 'adaptive_quiz__lecture_slide__title'
    )
    
    readonly_fields = (
        'attempts_count', 'best_score', 'latest_score', 'completed',
        'unlocked_next_level', 'first_attempt_at', 'last_attempt_at', 'completed_at'
    )
    
    ordering = ('-last_attempt_at',)
    
    def student_name(self, obj):
        return obj.student.get_full_name()
    student_name.short_description = 'Student'
    
    def student_number(self, obj):
        return obj.student.student_number
    student_number.short_description = 'Student #'
    
    def quiz_info(self, obj):
        return obj.adaptive_quiz.lecture_slide.title
    quiz_info.short_description = 'Quiz'
    
    def difficulty(self, obj):
        return obj.adaptive_quiz.difficulty.title()
    difficulty.short_description = 'Difficulty'


@admin.register(AdaptiveQuizAttempt)
class AdaptiveQuizAttemptAdmin(admin.ModelAdmin):
    """Admin interface for adaptive quiz attempts"""
    
    list_display = (
        'student_name', 'student_number', 'quiz_title', 'difficulty', 
        'score_percentage', 'completed_at'
    )
    
    list_filter = (
        'progress__adaptive_quiz__difficulty', 'score_percentage',
        'completed_at', 'progress__adaptive_quiz__lecture_slide__topic__course'
    )
    
    search_fields = (
        'progress__student__username', 'progress__student__first_name',
        'progress__student__last_name', 'progress__student__student_number',
        'progress__adaptive_quiz__lecture_slide__title'
    )
    
    readonly_fields = ('score_percentage', 'started_at', 'completed_at')
    
    ordering = ('-completed_at',)
    
    def student_name(self, obj):
        return obj.progress.student.get_full_name()
    student_name.short_description = 'Student'
    
    def student_number(self, obj):
        return obj.progress.student.student_number
    student_number.short_description = 'Student #'
    
    def quiz_title(self, obj):
        return obj.progress.adaptive_quiz.lecture_slide.title
    quiz_title.short_description = 'Quiz'
    
    def difficulty(self, obj):
        return obj.progress.adaptive_quiz.difficulty.title()
    difficulty.short_description = 'Difficulty'