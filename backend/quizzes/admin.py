from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import Quiz, Question, Choice, QuizAttempt, Answer


class ChoiceInline(admin.TabularInline):
    """Inline for question choices"""
    model = Choice
    extra = 2
    fields = ('choice_text', 'is_correct', 'order')
    ordering = ('order',)


class QuestionInline(admin.TabularInline):
    """Inline for quiz questions"""
    model = Question
    extra = 0
    fields = ('question_text', 'question_type', 'points', 'order')
    ordering = ('order',)


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    """Quiz admin"""
    list_display = (
        'title', 'topic', 'get_course', 'total_points', 
        'get_questions_count', 'get_attempts_count', 'is_live', 'is_active'
    )
    list_filter = ('is_active', 'is_live', 'is_graded', 'created_at', 'topic__course')
    search_fields = ('title', 'topic__name', 'topic__course__code')
    readonly_fields = ('total_points', 'created_at', 'updated_at', 'started_at')
    ordering = ('-created_at',)
    
    fieldsets = (
        (None, {
            'fields': ('topic', 'title', 'description')
        }),
        ('Settings', {
            'fields': ('time_limit', 'is_graded', 'show_results_immediately', 'is_active')
        }),
        ('Live Quiz', {
            'fields': ('is_live', 'quiz_password', 'started_at'),
            'classes': ('collapse',)
        }),
        ('Statistics', {
            'fields': ('total_points',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    inlines = [QuestionInline]
    
    def get_course(self, obj):
        return obj.topic.course
    get_course.short_description = 'Course'
    
    def get_questions_count(self, obj):
        return obj.get_questions_count()
    get_questions_count.short_description = 'Questions'
    
    def get_attempts_count(self, obj):
        return obj.get_attempts_count()
    get_attempts_count.short_description = 'Attempts'
    
    actions = ['start_live_quiz', 'stop_live_quiz', 'activate_quizzes', 'deactivate_quizzes']
    
    def start_live_quiz(self, request, queryset):
        """Start live quiz sessions"""
        # This is a simple implementation - in practice you'd want a form for password
        updated = 0
        for quiz in queryset:
            if not quiz.is_live:
                quiz.start_live_quiz('ADMIN123')  # Default password
                updated += 1
        
        self.message_user(
            request,
            f'Started {updated} live quiz sessions with password "ADMIN123".'
        )
    start_live_quiz.short_description = 'Start live quiz sessions'
    
    def stop_live_quiz(self, request, queryset):
        """Stop live quiz sessions"""
        updated = 0
        for quiz in queryset:
            if quiz.is_live:
                quiz.stop_live_quiz()
                updated += 1
        
        self.message_user(
            request,
            f'Stopped {updated} live quiz sessions.'
        )
    stop_live_quiz.short_description = 'Stop live quiz sessions'
    
    def activate_quizzes(self, request, queryset):
        """Activate selected quizzes"""
        updated = queryset.update(is_active=True)
        self.message_user(
            request,
            f'Successfully activated {updated} quizzes.'
        )
    activate_quizzes.short_description = 'Activate selected quizzes'
    
    def deactivate_quizzes(self, request, queryset):
        """Deactivate selected quizzes"""
        updated = queryset.update(is_active=False)
        self.message_user(
            request,
            f'Successfully deactivated {updated} quizzes.'
        )
    deactivate_quizzes.short_description = 'Deactivate selected quizzes'


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    """Question admin"""
    list_display = (
        'get_short_text', 'quiz', 'question_type', 'points', 
        'order', 'get_choices_count'
    )
    list_filter = ('question_type', 'quiz__topic__course', 'quiz')
    search_fields = ('question_text', 'quiz__title')
    ordering = ('quiz', 'order')
    
    fieldsets = (
        (None, {
            'fields': ('quiz', 'question_text', 'question_type', 'points', 'order')
        }),
        ('Short Answer', {
            'fields': ('correct_answer_text',),
            'classes': ('collapse',),
            'description': 'Only for short answer questions'
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    inlines = [ChoiceInline]
    readonly_fields = ('created_at', 'updated_at')
    
    def get_short_text(self, obj):
        return f"{obj.question_text[:50]}..." if len(obj.question_text) > 50 else obj.question_text
    get_short_text.short_description = 'Question'
    
    def get_choices_count(self, obj):
        return obj.get_choices_count()
    get_choices_count.short_description = 'Choices'


@admin.register(Choice)
class ChoiceAdmin(admin.ModelAdmin):
    """Choice admin"""
    list_display = ('choice_text', 'question', 'is_correct', 'order')
    list_filter = ('is_correct', 'question__quiz__topic__course')
    search_fields = ('choice_text', 'question__question_text')
    ordering = ('question', 'order')
    
    fieldsets = (
        (None, {
            'fields': ('question', 'choice_text', 'is_correct', 'order')
        }),
    )


class AnswerInline(admin.TabularInline):
    """Inline for quiz attempt answers"""
    model = Answer
    extra = 0
    readonly_fields = ('question', 'selected_choice', 'answer_text', 'is_correct', 'points_earned')
    fields = ('question', 'selected_choice', 'answer_text', 'is_correct', 'points_earned')
    
    def has_add_permission(self, request, obj=None):
        return False


@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    """Quiz attempt admin"""
    list_display = (
        'student', 'quiz', 'get_course', 'score_percentage', 
        'is_completed', 'is_submitted', 'get_duration', 'started_at'
    )
    list_filter = (
        'is_completed', 'is_submitted', 'started_at', 
        'quiz__topic__course', 'quiz'
    )
    search_fields = (
        'student__username', 'student__first_name', 'student__last_name',
        'quiz__title', 'quiz__topic__course__code'
    )
    readonly_fields = (
        'started_at', 'completed_at', 'score_points', 
        'score_percentage', 'get_duration'
    )
    ordering = ('-started_at',)
    
    fieldsets = (
        (None, {
            'fields': ('student', 'quiz', 'password_used')
        }),
        ('Status', {
            'fields': ('is_completed', 'is_submitted')
        }),
        ('Scoring', {
            'fields': ('score_points', 'score_percentage'),
            'classes': ('collapse',)
        }),
        ('Timing', {
            'fields': ('started_at', 'completed_at', 'get_duration'),
            'classes': ('collapse',)
        }),
    )
    
    inlines = [AnswerInline]
    
    def get_course(self, obj):
        return obj.quiz.topic.course
    get_course.short_description = 'Course'
    
    def get_duration(self, obj):
        return obj.get_duration()
    get_duration.short_description = 'Duration'
    
    actions = ['mark_as_completed', 'recalculate_scores']
    
    def mark_as_completed(self, request, queryset):
        """Mark attempts as completed"""
        updated = 0
        for attempt in queryset:
            if not attempt.is_completed:
                attempt.submit_attempt()
                updated += 1
        
        self.message_user(
            request,
            f'Marked {updated} attempts as completed and recalculated scores.'
        )
    mark_as_completed.short_description = 'Mark as completed and calculate scores'
    
    def recalculate_scores(self, request, queryset):
        """Recalculate scores for selected attempts"""
        updated = 0
        for attempt in queryset:
            attempt.calculate_score()
            updated += 1
        
        self.message_user(
            request,
            f'Recalculated scores for {updated} attempts.'
        )
    recalculate_scores.short_description = 'Recalculate scores'


@admin.register(Answer)
class AnswerAdmin(admin.ModelAdmin):
    """Answer admin"""
    list_display = (
        'get_student', 'get_quiz', 'question', 'get_answer_preview',
        'is_correct', 'points_earned', 'created_at'
    )
    list_filter = (
        'is_correct', 'question__question_type', 
        'quiz_attempt__quiz__topic__course', 'created_at'
    )
    search_fields = (
        'quiz_attempt__student__username', 'quiz_attempt__student__first_name',
        'quiz_attempt__student__last_name', 'question__question_text',
        'answer_text', 'selected_choice__choice_text'
    )
    readonly_fields = ('is_correct', 'points_earned', 'created_at', 'updated_at')
    ordering = ('-created_at',)
    
    fieldsets = (
        (None, {
            'fields': ('quiz_attempt', 'question')
        }),
        ('Answer', {
            'fields': ('selected_choice', 'answer_text')
        }),
        ('Grading', {
            'fields': ('is_correct', 'points_earned'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_student(self, obj):
        return obj.quiz_attempt.student
    get_student.short_description = 'Student'
    
    def get_quiz(self, obj):
        return obj.quiz_attempt.quiz
    get_quiz.short_description = 'Quiz'
    
    def get_answer_preview(self, obj):
        if obj.selected_choice:
            return f"Choice: {obj.selected_choice.choice_text[:30]}..."
        elif obj.answer_text:
            return f"Text: {obj.answer_text[:30]}..."
        return "No answer"
    get_answer_preview.short_description = 'Answer'


# Update admin site header
admin.site.site_header = 'Amandla Quiz Management'
admin.site.site_title = 'Amandla Admin'
admin.site.index_title = 'Course Engagement System Administration'