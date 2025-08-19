from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from users.models import User
from courses.models import Topic


class Quiz(models.Model):
    """Quiz model"""
    id = models.AutoField(primary_key=True)
    topic = models.ForeignKey(
        Topic,
        on_delete=models.CASCADE,
        related_name='quizzes'
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # Quiz settings
    time_limit = models.DurationField(null=True, blank=True)  # in minutes
    total_points = models.PositiveIntegerField(default=0)
    is_graded = models.BooleanField(default=True)
    show_results_immediately = models.BooleanField(default=True)
    
    # Quiz state
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Live quiz settings
    quiz_password = models.CharField(max_length=50, blank=True)
    is_live = models.BooleanField(default=False)
    started_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Quizzes'
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Auto-calculate total points
        self.update_total_points()
    
    def update_total_points(self):
        """Calculate total points from questions"""
        total = self.questions.aggregate(
            total=models.Sum('points')
        )['total'] or 0
        if self.total_points != total:
            Quiz.objects.filter(id=self.id).update(total_points=total)
    
    def get_questions_count(self):
        """Get count of questions in quiz"""
        return self.questions.count()
    
    def get_attempts_count(self):
        """Get count of quiz attempts"""
        return self.attempts.count()
    
    def start_live_quiz(self, password):
        """Start a live quiz session"""
        self.quiz_password = password
        self.is_live = True
        self.started_at = timezone.now()
        self.save()
    
    def stop_live_quiz(self):
        """Stop live quiz session"""
        self.is_live = False
        self.quiz_password = ''
        self.save()
    
    def __str__(self):
        return f"{self.topic.course.code} - {self.title}"


class Question(models.Model):
    """Quiz questions"""
    QUESTION_TYPES = [
        ('MCQ', 'Multiple Choice'),
        ('TF', 'True/False'),
        ('SA', 'Short Answer'),
    ]
    
    id = models.AutoField(primary_key=True)
    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name='questions'
    )
    question_text = models.TextField()
    question_type = models.CharField(max_length=3, choices=QUESTION_TYPES, default='MCQ')
    points = models.PositiveIntegerField(default=1)
    order = models.PositiveIntegerField(default=1)
    
    # For short answer questions
    correct_answer_text = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['order', 'created_at']
        unique_together = ('quiz', 'order')
    
    def get_correct_choice(self):
        """Get the correct choice for MCQ/TF questions"""
        return self.choices.filter(is_correct=True).first()
    
    def get_choices_count(self):
        """Get count of choices for this question"""
        return self.choices.count()
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Update quiz total points
        self.quiz.update_total_points()
    
    def __str__(self):
        return f"Q{self.order}: {self.question_text[:50]}..."


class Choice(models.Model):
    """Multiple choice answers"""
    id = models.AutoField(primary_key=True)
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name='choices'
    )
    choice_text = models.CharField(max_length=500)
    is_correct = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=1)
    
    class Meta:
        ordering = ['order']
        unique_together = ('question', 'order')
    
    def save(self, *args, **kwargs):
        # Ensure only one correct answer for MCQ/TF
        if self.is_correct and self.question.question_type in ['MCQ', 'TF']:
            Choice.objects.filter(
                question=self.question
            ).update(is_correct=False)
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.choice_text} ({'✓' if self.is_correct else '✗'})"


class QuizAttempt(models.Model):
    """Student quiz attempts"""
    id = models.AutoField(primary_key=True)
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        limit_choices_to={'user_type': 'student'},
        related_name='quiz_attempts'
    )
    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name='attempts'
    )
    
    # Attempt details
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    is_completed = models.BooleanField(default=False)
    is_submitted = models.BooleanField(default=False)
    
    # Scoring
    score_points = models.PositiveIntegerField(default=0)
    score_percentage = models.FloatField(default=0.0)
    
    # Password verification (for live quizzes)
    password_used = models.CharField(max_length=50, blank=True)
    
    class Meta:
        ordering = ['-started_at']
        unique_together = ('student', 'quiz')  # One attempt per student per quiz
    
    def calculate_score(self):
        """Calculate the score for this attempt"""
        total_points = 0
        earned_points = 0
        
        for answer in self.answers.all():
            total_points += answer.question.points
            if answer.is_correct:
                earned_points += answer.question.points
        
        self.score_points = earned_points
        if total_points > 0:
            self.score_percentage = (earned_points / total_points) * 100
        else:
            self.score_percentage = 0.0
        
        self.save()
        return self.score_points, self.score_percentage
    
    def submit_attempt(self):
        """Submit and finalize the attempt"""
        self.is_completed = True
        self.is_submitted = True
        self.completed_at = timezone.now()
        self.calculate_score()
        
        # Update student profile statistics
        self.update_student_stats()
    
    def update_student_stats(self):
        """Update student profile statistics"""
        profile = getattr(self.student, 'student_profile', None)
        if profile:
            profile.total_quizzes_completed += 1
            profile.total_correct_answers += self.score_points
            
            # Update streak
            if self.score_percentage >= 70:  # Consider 70%+ as success
                profile.current_streak += 1
                if profile.current_streak > profile.longest_streak:
                    profile.longest_streak = profile.current_streak
            else:
                profile.current_streak = 0
            
            # Update fastest time
            if self.completed_at and self.started_at:
                duration = self.completed_at - self.started_at
                if not profile.fastest_quiz_time or duration < profile.fastest_quiz_time:
                    profile.fastest_quiz_time = duration
            
            profile.save()
    
    def get_duration(self):
        """Get attempt duration"""
        if self.completed_at and self.started_at:
            return self.completed_at - self.started_at
        return None
    
    def __str__(self):
        return f"{self.student.get_full_name()} - {self.quiz.title} ({self.score_percentage:.1f}%)"


class Answer(models.Model):
    """Student answers to quiz questions"""
    id = models.AutoField(primary_key=True)
    quiz_attempt = models.ForeignKey(
        QuizAttempt,
        on_delete=models.CASCADE,
        related_name='answers'
    )
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE
    )
    
    # For MCQ/TF questions
    selected_choice = models.ForeignKey(
        Choice,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    
    # For short answer questions
    answer_text = models.TextField(blank=True)
    
    # Grading
    is_correct = models.BooleanField(default=False)
    points_earned = models.PositiveIntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('quiz_attempt', 'question')
        ordering = ['question__order']
    
    def save(self, *args, **kwargs):
        # Auto-grade the answer
        self.grade_answer()
        super().save(*args, **kwargs)
    
    def grade_answer(self):
        """Automatically grade the answer"""
        if self.question.question_type in ['MCQ', 'TF']:
            if self.selected_choice and self.selected_choice.is_correct:
                self.is_correct = True
                self.points_earned = self.question.points
            else:
                self.is_correct = False
                self.points_earned = 0
        elif self.question.question_type == 'SA':
            # Simple text comparison for short answers
            if (self.answer_text.strip().lower() == 
                self.question.correct_answer_text.strip().lower()):
                self.is_correct = True
                self.points_earned = self.question.points
            else:
                self.is_correct = False
                self.points_earned = 0
    
    def __str__(self):
        return f"{self.quiz_attempt.student.get_full_name()} - Q{self.question.order}"