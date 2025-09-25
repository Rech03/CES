from django.db import models
from django.utils import timezone
from users.models import User
from courses.models import Course
import string
import random


class LiveQASession(models.Model):
    """Simple Live Q&A Session Model"""
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('ended', 'Ended'),
    ]
    
    id = models.AutoField(primary_key=True)
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='live_qa_sessions'
    )
    lecturer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        limit_choices_to={'user_type': 'lecturer'},
        related_name='live_qa_sessions'
    )
    title = models.CharField(max_length=200)
    session_code = models.CharField(max_length=6, unique=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def save(self, *args, **kwargs):
        if not self.session_code:
            self.session_code = self.generate_session_code()
        super().save(*args, **kwargs)
    
    def generate_session_code(self):
        """Generate unique 6-character session code"""
        while True:
            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            if not LiveQASession.objects.filter(session_code=code).exists():
                return code
    
    def get_participants_count(self):
        """Get count of messages (since students are anonymous)"""
        return self.messages.count()
    
    def get_messages_count(self):
        """Get total messages count"""
        return self.messages.count()
    
    def end_session(self):
        """End the session"""
        self.status = 'ended'
        self.ended_at = timezone.now()
        self.save()
    
    def __str__(self):
        return f"{self.course.code} - {self.title} ({self.session_code})"


class LiveQAMessage(models.Model):
    """Simple anonymous messages in Live Q&A sessions"""
    id = models.AutoField(primary_key=True)
    session = models.ForeignKey(
        LiveQASession,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    message = models.TextField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Anonymous: {self.message[:50]}..."