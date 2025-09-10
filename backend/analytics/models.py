from django.db import models
from django.utils import timezone
from datetime import timedelta
from users.models import User
from courses.models import Course
from quizzes.models import QuizAttempt
import json
from django.core.exceptions import ValidationError


class StudentEngagementMetrics(models.Model):
    """Track student engagement and performance metrics"""
    student = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        limit_choices_to={'user_type': 'student'},
        related_name='engagement_metrics'
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='student_metrics'
    )
    
    # Performance categories based on quiz averages
    PERFORMANCE_CHOICES = [
        ('danger', 'In Danger (<50%)'),
        ('good', 'Good (50-70%)'), 
        ('excellent', 'Excellent (>70%)')
    ]
    
    # Quiz performance metrics
    total_quizzes_taken = models.PositiveIntegerField(default=0)
    total_quiz_score = models.FloatField(default=0.0)
    average_quiz_score = models.FloatField(default=0.0)
    performance_category = models.CharField(max_length=10, choices=PERFORMANCE_CHOICES, default='good')
    
    # Engagement tracking
    consecutive_missed_quizzes = models.PositiveIntegerField(default=0)
    last_quiz_date = models.DateField(null=True, blank=True)
    intervention_email_sent = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('student', 'course')
        ordering = ['-average_quiz_score']
    
    def calculate_metrics(self):
        """Calculate and update all metrics for this student-course pair"""
        # Get all quiz attempts for this student in this course
        attempts = QuizAttempt.objects.filter(
            student=self.student,
            quiz__topic__course=self.course,
            is_completed=True
        )
        
        if attempts.exists():
            self.total_quizzes_taken = attempts.count()
            self.total_quiz_score = sum(attempt.score_percentage for attempt in attempts)
            self.average_quiz_score = self.total_quiz_score / self.total_quizzes_taken
            
            # Update performance category
            if self.average_quiz_score < 50:
                self.performance_category = 'danger'
            elif self.average_quiz_score < 70:
                self.performance_category = 'good'
            else:
                self.performance_category = 'excellent'
            
            # Update last quiz date
            latest_attempt = attempts.order_by('-started_at').first()
            self.last_quiz_date = latest_attempt.started_at.date()
        
        # Calculate consecutive missed quizzes
        self.calculate_consecutive_misses()
        
        self.save()
    
    def calculate_consecutive_misses(self):
        """Calculate consecutive missed in-class quizzes"""
        from quizzes.models import Quiz
        
        # Get all in-class quizzes for this course (ordered by creation date)
        course_quizzes = Quiz.objects.filter(
            topic__course=self.course,
            is_active=True
        ).order_by('-created_at')[:10]  # Check last 10 quizzes
        
        consecutive_misses = 0
        for quiz in course_quizzes:
            attempt_exists = QuizAttempt.objects.filter(
                student=self.student,
                quiz=quiz
            ).exists()
            
            if not attempt_exists:
                consecutive_misses += 1
            else:
                break  # Stop counting when we find an attempt
        
        self.consecutive_missed_quizzes = consecutive_misses
        
        # Trigger intervention email if needed
        if consecutive_misses >= 3 and not self.intervention_email_sent:
            self.send_intervention_email()
    
    def send_intervention_email(self):
        """Send intervention email to student"""
        from django.core.mail import send_mail
        from django.conf import settings
        
        subject = f"Course Engagement Alert - {self.course.code}"
        message = f"""
        Dear {self.student.get_full_name()},
        
        We've noticed you've missed 3 consecutive quizzes in {self.course.name} ({self.course.code}).
        
        If you need help or support, please reach out to your lecturer:
        {self.course.lecturer.get_full_name()} - {self.course.lecturer.email}
        
        We're here to help you succeed!
        
        Best regards,
        Course Engagement System
        """
        
        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [self.student.email],
                fail_silently=False,
            )
            self.intervention_email_sent = True
            self.save()
        except Exception as e:
            print(f"Failed to send intervention email: {e}")
    
    def reset_intervention_status(self):
        """Reset intervention status when student re-engages"""
        if self.consecutive_missed_quizzes == 0:
            self.intervention_email_sent = False
            self.save()
    
    def __str__(self):
        return f"{self.student.get_full_name()} - {self.course.code} ({self.performance_category})"


class DailyEngagement(models.Model):
    """Track daily student engagement for heatmap"""
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        limit_choices_to={'user_type': 'student'},
        related_name='daily_engagements'
    )
    date = models.DateField()
    engaged = models.BooleanField(default=False)
    quiz_completed = models.BooleanField(default=False)
    
    class Meta:
        unique_together = ('student', 'date')
        ordering = ['-date']
    
    @classmethod
    def mark_engagement(cls, student, date=None):
        """Mark student as engaged for a specific date"""
        if date is None:
            date = timezone.now().date()
        
        engagement, created = cls.objects.get_or_create(
            student=student,
            date=date,
            defaults={'engaged': True, 'quiz_completed': True}
        )
        
        if not created:
            engagement.engaged = True
            engagement.quiz_completed = True
            engagement.save()
        
        return engagement
    
    def __str__(self):
        return f"{self.student.get_full_name()} - {self.date} ({'✓' if self.engaged else '✗'})"

class LectureSlide(models.Model):
    """Lecture slides uploaded by lecturers"""
    topic = models.ForeignKey(
        'courses.Topic',
        on_delete=models.CASCADE,
        related_name='lecture_slides'
    )
    title = models.CharField(max_length=200)
    slide_file = models.FileField(
        upload_to='lecture_slides/',
        help_text='Upload PDF lecture slides'
    )
    extracted_text = models.TextField(
        blank=True,
        help_text='Automatically extracted text from PDF'
    )
    uploaded_by = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        limit_choices_to={'user_type': 'lecturer'}
    )
    questions_generated = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def clean(self):
        """Validate file format"""
        if self.slide_file and not self.slide_file.name.lower().endswith('.pdf'):
            raise ValidationError('Only PDF files are allowed.')
    
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
        
        # Extract text from PDF after saving
        if self.slide_file and not self.extracted_text:
            self.extract_text_from_pdf()
    
    def extract_text_from_pdf(self):
        """Extract text from uploaded PDF"""
        try:
            import PyPDF2
            
            with open(self.slide_file.path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text_content = []
                
                for page in pdf_reader.pages:
                    text_content.append(page.extract_text())
                
                self.extracted_text = '\n'.join(text_content)
                self.save(update_fields=['extracted_text'])
                
        except Exception as e:
            print(f"Error extracting text from PDF: {e}")
            # Fallback: set a placeholder text
            self.extracted_text = "Text extraction failed. Please check PDF format."
            self.save(update_fields=['extracted_text'])
    
    def __str__(self):
        return f"{self.topic.course.code} - {self.title}"


class AdaptiveQuiz(models.Model):
    """Adaptive quizzes generated from lecture slides"""
    DIFFICULTY_CHOICES = [
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard')
    ]
    
    lecture_slide = models.ForeignKey(
        LectureSlide,
        on_delete=models.CASCADE,
        related_name='adaptive_quizzes'
    )
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES)
    
    # Store Claude-generated questions as JSON
    questions_data = models.JSONField(
        help_text='Questions, options, and explanations generated by Claude'
    )
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['difficulty', '-created_at']
        unique_together = ('lecture_slide', 'difficulty')
    
    def get_questions(self):
        """Get questions as Python dict"""
        return self.questions_data if isinstance(self.questions_data, dict) else {}
    
    def get_question_count(self):
        """Get number of questions in this quiz"""
        questions = self.get_questions()
        return len(questions.get('questions', []))
    
    def __str__(self):
        return f"{self.lecture_slide.title} - {self.difficulty.title()}"


class StudentAdaptiveProgress(models.Model):
    """Track student progress through adaptive quizzes"""
    student = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        limit_choices_to={'user_type': 'student'},
        related_name='adaptive_progress'
    )
    adaptive_quiz = models.ForeignKey(
        AdaptiveQuiz,
        on_delete=models.CASCADE,
        related_name='student_progress'
    )
    
    # Attempt tracking
    attempts_count = models.PositiveIntegerField(default=0)
    best_score = models.FloatField(default=0.0)
    latest_score = models.FloatField(default=0.0)
    
    # Progress tracking
    completed = models.BooleanField(default=False)
    unlocked_next_level = models.BooleanField(default=False)
    explanation_viewed = models.BooleanField(default=False)
    
    # Timestamps
    first_attempt_at = models.DateTimeField(auto_now_add=True)
    last_attempt_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ('student', 'adaptive_quiz')
        ordering = ['-last_attempt_at']
    
    def can_attempt(self):
        """Check if student can attempt this quiz"""
        # Always allow attempts (unlimited tries)
        return True
    
    def should_show_explanation(self):
        """Check if explanation should be shown after 3 failed attempts"""
        return self.attempts_count >= 3 and self.latest_score < 50
    
    def mark_completed(self, score):
        """Mark quiz as completed with given score"""
        self.latest_score = score
        if score > self.best_score:
            self.best_score = score
        
        # Mark as completed if score >= 50%
        if score >= 50 and not self.completed:
            self.completed = True
            self.completed_at = timezone.now()
            
            # Check if next level should be unlocked
            self.check_unlock_next_level()
    
    def check_unlock_next_level(self):
        """Check if next difficulty level should be unlocked"""
        if not self.completed:
            return
        
        current_difficulty = self.adaptive_quiz.difficulty
        lecture_slide = self.adaptive_quiz.lecture_slide
        
        # Define progression path
        progression = {
            'easy': 'medium',
            'medium': 'hard',
            'hard': None  # No next level
        }
        
        next_difficulty = progression.get(current_difficulty)
        if next_difficulty:
            try:
                next_quiz = AdaptiveQuiz.objects.get(
                    lecture_slide=lecture_slide,
                    difficulty=next_difficulty
                )
                
                # Create or update progress for next level
                next_progress, created = StudentAdaptiveProgress.objects.get_or_create(
                    student=self.student,
                    adaptive_quiz=next_quiz,
                    defaults={'unlocked_next_level': True}
                )
                
                if not created:
                    next_progress.unlocked_next_level = True
                    next_progress.save()
                
                self.unlocked_next_level = True
                
            except AdaptiveQuiz.DoesNotExist:
                pass  # Next level doesn't exist yet
    
    def __str__(self):
        return f"{self.student.get_full_name()} - {self.adaptive_quiz}"


class AdaptiveQuizAttempt(models.Model):
    """Individual attempts at adaptive quizzes"""
    progress = models.ForeignKey(
        StudentAdaptiveProgress,
        on_delete=models.CASCADE,
        related_name='attempts'
    )
    
    # Attempt details
    answers_data = models.JSONField(
        help_text='Student answers for this attempt'
    )
    score_percentage = models.FloatField()
    time_taken = models.DurationField(null=True, blank=True)
    
    # Timestamps
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-started_at']
    
    def get_answers(self):
        """Get answers as Python dict"""
        return self.answers_data if isinstance(self.answers_data, dict) else {}
    
    def __str__(self):
        return f"Attempt {self.id} - {self.progress.student.get_full_name()} ({self.score_percentage}%)"