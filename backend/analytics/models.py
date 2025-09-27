from django.db import models
from django.utils import timezone
from datetime import timedelta
from users.models import User
from courses.models import Course


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
    
    def calculate_ai_quiz_metrics(self):
        """Calculate and update metrics based on AI quiz attempts"""
        from ai_quiz.models import AdaptiveQuizAttempt
    
        # Get all AI quiz attempts for this student in this course
        ai_attempts = AdaptiveQuizAttempt.objects.filter(
            progress__student=self.student,
            progress__adaptive_quiz__lecture_slide__topic__course=self.course
        )
    
        if ai_attempts.exists():
            self.total_quizzes_taken = ai_attempts.count()
            self.total_quiz_score = sum(attempt.score_percentage for attempt in ai_attempts)
            self.average_quiz_score = self.total_quiz_score / self.total_quizzes_taken
        
            # Update performance category based on AI quiz scores
            if self.average_quiz_score < 50:
                self.performance_category = 'danger'
            elif self.average_quiz_score < 70:
                self.performance_category = 'good'
            else:
                self.performance_category = 'excellent'
        
            # Update last quiz date
            latest_attempt = ai_attempts.order_by('-started_at').first()
            if latest_attempt:
                self.last_quiz_date = latest_attempt.started_at.date()
    
        # Calculate consecutive missed AI quizzes
        self.calculate_consecutive_ai_quiz_misses()
    
        self.save()

    def calculate_consecutive_ai_quiz_misses(self):
        """Calculate consecutive missed AI quiz opportunities"""
        from ai_quiz.models import AdaptiveQuiz, AdaptiveQuizAttempt
    
        # Get all available AI quizzes for this course (only easy level for attendance)
        available_quizzes = AdaptiveQuiz.objects.filter(
            lecture_slide__topic__course=self.course,
            difficulty='easy',
            status='published',  # FIXED: Only check published quizzes
            is_active=True
        ).order_by('-created_at')[:10]  # Check last 10 available quizzes
    
        consecutive_misses = 0
        for quiz in available_quizzes:
            attempt_exists = AdaptiveQuizAttempt.objects.filter(
                progress__student=self.student,
                progress__adaptive_quiz=quiz
            ).exists()
        
            if not attempt_exists:
                consecutive_misses += 1
            else:
                break  # Stop counting when we find an attempt
    
        self.consecutive_missed_quizzes = consecutive_misses
    
        # Trigger intervention email if needed (3+ missed AI quizzes)
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
        Amandla Course Engagement System
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
        return f"{self.student.get_full_name()} - {self.date} ({'engaged' if self.engaged else 'not engaged'})"