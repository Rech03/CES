from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Count, Avg, Sum
from django.contrib import messages
from .models import LectureSlide, AdaptiveQuiz, StudentAdaptiveProgress, AdaptiveQuizAttempt


@admin.register(LectureSlide)
class LectureSlideAdmin(admin.ModelAdmin):
    """Admin interface for lecture slides"""
    
    list_display = (
        'title', 'topic_course', 'uploaded_by_name', 'questions_generated_status',
        'file_size_display', 'quiz_count', 'created_at'
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
    
    fieldsets = (
        ('Slide Information', {
            'fields': ('topic', 'title', 'slide_file', 'uploaded_by')
        }),
        ('Generated Content', {
            'fields': ('extracted_text', 'questions_generated'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def topic_course(self, obj):
        return f"{obj.topic.course.code} - {obj.topic.name}"
    topic_course.short_description = 'Course & Topic'
    
    def uploaded_by_name(self, obj):
        return obj.uploaded_by.get_full_name()
    uploaded_by_name.short_description = 'Uploaded By'
    
    def questions_generated_status(self, obj):
        if obj.questions_generated:
            return format_html(
                '<span style="color: #28a745; font-weight: bold;">✓ Generated</span>'
            )
        else:
            return format_html(
                '<span style="color: #dc3545; font-weight: bold;">✗ Not Generated</span>'
            )
    questions_generated_status.short_description = 'Questions Status'
    
    def file_size_display(self, obj):
        if obj.slide_file:
            try:
                size_mb = obj.slide_file.size / (1024 * 1024)
                return f"{size_mb:.2f} MB"
            except:
                return "Unknown"
        return "No file"
    file_size_display.short_description = 'File Size'
    
    def quiz_count(self, obj):
        return obj.adaptive_quizzes.count()
    quiz_count.short_description = 'Quizzes'
    
    actions = ['generate_questions_action', 'regenerate_questions_action']
    
    def generate_questions_action(self, request, queryset):
        """Generate questions for selected slides"""
        try:
            from .services import ClaudeAPIService
            claude_service = ClaudeAPIService()
        except ValueError as e:
            self.message_user(
                request,
                f'Claude API not configured: {str(e)}',
                level=messages.ERROR
            )
            return
        
        generated_count = 0
        error_count = 0
        
        for slide in queryset:
            if slide.questions_generated:
                continue
                
            if not slide.extracted_text:
                error_count += 1
                continue
                
            try:
                questions_data = claude_service.generate_questions_from_content(
                    slide.extracted_text, slide.title
                )
                
                # Create adaptive quizzes
                for difficulty in ['easy', 'medium', 'hard']:
                    difficulty_questions = [
                        q for q in questions_data.get('questions', [])
                        if q.get('difficulty') == difficulty
                    ]
                    
                    if difficulty_questions:
                        quiz_data = {'questions': difficulty_questions}
                        AdaptiveQuiz.objects.create(
                            lecture_slide=slide,
                            difficulty=difficulty,
                            questions_data=quiz_data
                        )
                
                slide.questions_generated = True
                slide.save()
                generated_count += 1
                
            except Exception as e:
                error_count += 1
                continue
        
        message = f'Generated questions for {generated_count} slides.'
        if error_count > 0:
            message += f' {error_count} slides had errors.'
        
        self.message_user(request, message)
    generate_questions_action.short_description = 'Generate questions for selected slides'
    
    def regenerate_questions_action(self, request, queryset):
        """Regenerate questions for selected slides"""
        try:
            from .services import ClaudeAPIService
            claude_service = ClaudeAPIService()
        except ValueError as e:
            self.message_user(
                request,
                f'Claude API not configured: {str(e)}',
                level=messages.ERROR
            )
            return
        
        regenerated_count = 0
        error_count = 0
        
        for slide in queryset:
            if not slide.extracted_text:
                error_count += 1
                continue
                
            try:
                # Delete existing quizzes
                AdaptiveQuiz.objects.filter(lecture_slide=slide).delete()
                
                # Generate new questions
                questions_data = claude_service.generate_questions_from_content(
                    slide.extracted_text, slide.title
                )
                
                # Create new adaptive quizzes
                for difficulty in ['easy', 'medium', 'hard']:
                    difficulty_questions = [
                        q for q in questions_data.get('questions', [])
                        if q.get('difficulty') == difficulty
                    ]
                    
                    if difficulty_questions:
                        quiz_data = {'questions': difficulty_questions}
                        AdaptiveQuiz.objects.create(
                            lecture_slide=slide,
                            difficulty=difficulty,
                            questions_data=quiz_data
                        )
                
                slide.questions_generated = True
                slide.save()
                regenerated_count += 1
                
            except Exception as e:
                error_count += 1
                continue
        
        message = f'Regenerated questions for {regenerated_count} slides.'
        if error_count > 0:
            message += f' {error_count} slides had errors.'
        
        self.message_user(request, message)
    regenerate_questions_action.short_description = 'Regenerate questions for selected slides'


@admin.register(AdaptiveQuiz)
class AdaptiveQuizAdmin(admin.ModelAdmin):
    """Admin interface for adaptive quizzes"""
    
    list_display = (
        'lecture_slide_title', 'course_code', 'difficulty_badge', 'question_count',
        'student_attempts', 'average_score', 'is_active', 'created_at'
    )
    
    list_filter = ('difficulty', 'is_active', 'created_at', 'lecture_slide__topic__course')
    
    search_fields = (
        'lecture_slide__title', 'lecture_slide__topic__course__code'
    )
    
    readonly_fields = ('question_count_display', 'created_at', 'average_score_display')
    
    ordering = ('lecture_slide', 'difficulty')
    
    fieldsets = (
        ('Quiz Information', {
            'fields': ('lecture_slide', 'difficulty', 'is_active')
        }),
        ('Statistics', {
            'fields': ('question_count_display', 'average_score_display'),
            'classes': ('collapse',)
        }),
        ('Questions Data', {
            'fields': ('questions_data',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    def lecture_slide_title(self, obj):
        return obj.lecture_slide.title
    lecture_slide_title.short_description = 'Lecture Slide'
    
    def course_code(self, obj):
        return obj.lecture_slide.topic.course.code
    course_code.short_description = 'Course'
    
    def difficulty_badge(self, obj):
        colors = {
            'easy': '#28a745',
            'medium': '#ffc107',
            'hard': '#dc3545'
        }
        color = colors.get(obj.difficulty, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; '
            'border-radius: 4px; font-size: 11px; font-weight: bold;">{}</span>',
            color,
            obj.difficulty.upper()
        )
    difficulty_badge.short_description = 'Difficulty'
    
    def question_count(self, obj):
        return obj.get_question_count()
    question_count.short_description = 'Questions'
    
    def question_count_display(self, obj):
        return obj.get_question_count()
    question_count_display.short_description = 'Number of Questions'
    
    def student_attempts(self, obj):
        return obj.student_progress.count()
    student_attempts.short_description = 'Students Attempted'
    
    def average_score(self, obj):
        attempts = AdaptiveQuizAttempt.objects.filter(
            progress__adaptive_quiz=obj
        )
        if attempts.exists():
            avg = sum(attempt.score_percentage for attempt in attempts) / attempts.count()
            return f"{avg:.1f}%"
        return "No attempts"
    average_score.short_description = 'Avg Score'
    
    def average_score_display(self, obj):
        return self.average_score(obj)
    average_score_display.short_description = 'Average Score'


@admin.register(StudentAdaptiveProgress)
class StudentAdaptiveProgressAdmin(admin.ModelAdmin):
    """Admin interface for student adaptive progress"""
    
    list_display = (
        'student_name', 'student_number', 'quiz_info', 'difficulty_badge', 
        'progress_status', 'best_score', 'attempts_count', 'last_attempt_at'
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
        return f"{obj.adaptive_quiz.lecture_slide.title}"
    quiz_info.short_description = 'Quiz'
    
    def difficulty_badge(self, obj):
        colors = {
            'easy': '#28a745',
            'medium': '#ffc107',
            'hard': '#dc3545'
        }
        difficulty = obj.adaptive_quiz.difficulty
        color = colors.get(difficulty, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; '
            'border-radius: 4px; font-size: 11px; font-weight: bold;">{}</span>',
            color,
            difficulty.upper()
        )
    difficulty_badge.short_description = 'Difficulty'
    
    def progress_status(self, obj):
        if obj.completed:
            return format_html(
                '<span style="color: #28a745; font-weight: bold;">✓ Completed ({:.1f}%)</span>',
                obj.best_score
            )
        elif obj.attempts_count > 0:
            return format_html(
                '<span style="color: #ffc107; font-weight: bold;">⚡ In Progress ({:.1f}%)</span>',
                obj.latest_score
            )
        else:
            return format_html(
                '<span style="color: #6c757d;">➖ Not Started</span>'
            )
    progress_status.short_description = 'Status'


@admin.register(AdaptiveQuizAttempt)
class AdaptiveQuizAttemptAdmin(admin.ModelAdmin):
    """Admin interface for adaptive quiz attempts"""
    
    list_display = (
        'student_name', 'student_number', 'quiz_title', 'difficulty_badge', 
        'score_badge', 'attempt_number', 'completed_at'
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
    
    def difficulty_badge(self, obj):
        colors = {
            'easy': '#28a745',
            'medium': '#ffc107', 
            'hard': '#dc3545'
        }
        difficulty = obj.progress.adaptive_quiz.difficulty
        color = colors.get(difficulty, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; '
            'border-radius: 4px; font-size: 11px; font-weight: bold;">{}</span>',
            color,
            difficulty.upper()
        )
    difficulty_badge.short_description = 'Difficulty'
    
    def score_badge(self, obj):
        score = obj.score_percentage
        if score >= 70:
            color = '#28a745'  # Green
        elif score >= 50:
            color = '#ffc107'  # Yellow
        else:
            color = '#dc3545'  # Red
        
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; '
            'border-radius: 4px; font-size: 11px; font-weight: bold;">{:.1f}%</span>',
            color,
            score
        )
    score_badge.short_description = 'Score'
    
    def attempt_number(self, obj):
        # Calculate which attempt this is for the student
        earlier_attempts = AdaptiveQuizAttempt.objects.filter(
            progress=obj.progress,
            started_at__lt=obj.started_at
        ).count()
        return earlier_attempts + 1
    attempt_number.short_description = 'Attempt #'