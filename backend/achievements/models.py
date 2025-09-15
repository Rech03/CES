from django.db import models
from django.utils import timezone
from users.models import User
from quizzes.models import QuizAttempt
from courses.models import Course


class BadgeType(models.Model):
    """Define different types of badges that can be earned"""
    BADGE_CATEGORIES = [
        ('performance', 'Performance'),
        ('streak', 'Streak'),
        ('completion', 'Completion'),
        ('special', 'Special'),
    ]
    
    BADGE_RARITIES = [
        ('common', 'Common'),
        ('earned', 'Earned'),
        ('gold', 'Gold'),
        ('legendary', 'Legendary'),
    ]
    
    name = models.CharField(max_length=100)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=BADGE_CATEGORIES)
    rarity = models.CharField(max_length=20, choices=BADGE_RARITIES, default='common')
    icon = models.CharField(max_length=50, help_text="Icon identifier for frontend")
    color = models.CharField(max_length=7, default="#f59e0b", help_text="Hex color code")
    xp_reward = models.IntegerField(default=100)
    
    # Criteria for earning the badge
    required_score = models.FloatField(null=True, blank=True, help_text="Required score percentage")
    required_streak = models.IntegerField(null=True, blank=True, help_text="Required consecutive days")
    required_quizzes = models.IntegerField(null=True, blank=True, help_text="Required number of quizzes")
    required_perfect_scores = models.IntegerField(null=True, blank=True, help_text="Required perfect scores")
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['category', 'rarity', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.get_rarity_display()})"


class StudentAchievement(models.Model):
    """Track student's overall achievement stats"""
    student = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='achievements',
        limit_choices_to={'user_type': 'student'}
    )
    
    # XP and Level System
    total_xp = models.IntegerField(default=0)
    level = models.IntegerField(default=1)
    xp_to_next_level = models.IntegerField(default=1000)
    
    # Streak Tracking
    current_streak = models.IntegerField(default=0)
    best_streak = models.IntegerField(default=0)
    last_activity_date = models.DateField(null=True, blank=True)
    
    # Performance Stats
    total_quizzes_completed = models.IntegerField(default=0)
    perfect_scores = models.IntegerField(default=0)
    average_score = models.FloatField(default=0.0)
    total_study_time = models.DurationField(default=timezone.timedelta)
    
    # Badge Collection
    badges_earned = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.student.get_full_name()} - Level {self.level}"
    
    def calculate_level(self):
        """Calculate level based on total XP"""
        # Simple level calculation: every 1000 XP = 1 level
        new_level = (self.total_xp // 1000) + 1
        if new_level != self.level:
            self.level = new_level
            self.xp_to_next_level = (new_level * 1000) - self.total_xp
            self.save()
        return self.level
    
    def add_xp(self, xp_amount):
        """Add XP and recalculate level"""
        self.total_xp += xp_amount
        self.calculate_level()
        self.save()
    
    def update_streak(self):
        """Update streak based on daily activity"""
        today = timezone.now().date()
        
        if self.last_activity_date:
            if self.last_activity_date == today:
                # Already logged activity today
                return self.current_streak
            elif self.last_activity_date == today - timezone.timedelta(days=1):
                # Consecutive day
                self.current_streak += 1
            else:
                # Streak broken
                self.current_streak = 1
        else:
            # First activity
            self.current_streak = 1
        
        if self.current_streak > self.best_streak:
            self.best_streak = self.current_streak
        
        self.last_activity_date = today
        self.save()
        return self.current_streak
    
    def update_stats(self):
        """Update all achievement stats based on quiz attempts"""
        attempts = QuizAttempt.objects.filter(
            student=self.student,
            is_completed=True
        )
        
        if attempts.exists():
            self.total_quizzes_completed = attempts.count()
            self.perfect_scores = attempts.filter(score_percentage=100).count()
            self.average_score = attempts.aggregate(
                avg=models.Avg('score_percentage')
            )['avg'] or 0
            
            # Calculate total study time (rough estimate)
            total_duration = timezone.timedelta()
            for attempt in attempts:
                if attempt.time_taken:
                    total_duration += attempt.time_taken
            self.total_study_time = total_duration
        
        self.save()


class EarnedBadge(models.Model):
    """Track badges earned by students"""
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='earned_badges',
        limit_choices_to={'user_type': 'student'}
    )
    badge_type = models.ForeignKey(BadgeType, on_delete=models.CASCADE)
    earned_at = models.DateTimeField(auto_now_add=True)
    course = models.ForeignKey(
        Course, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        help_text="Course context where badge was earned"
    )
    
    class Meta:
        unique_together = ['student', 'badge_type']
        ordering = ['-earned_at']
    
    def __str__(self):
        return f"{self.student.get_full_name()} - {self.badge_type.name}"


class DailyActivity(models.Model):
    """Track daily student activity for streak calculation"""
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='daily_activities',
        limit_choices_to={'user_type': 'student'}
    )
    date = models.DateField()
    quizzes_completed = models.IntegerField(default=0)
    xp_earned = models.IntegerField(default=0)
    study_time = models.DurationField(default=timezone.timedelta)
    
    class Meta:
        unique_together = ['student', 'date']
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.student.get_full_name()} - {self.date}"