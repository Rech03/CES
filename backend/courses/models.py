from django.db import models
from django.utils import timezone
from users.models import User


class Course(models.Model):
    """Course model"""
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField()
    lecturer = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        limit_choices_to={'user_type': 'lecturer'},
        related_name='courses_taught'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    
    class Meta:
        ordering = ['name']
    
    def get_enrolled_students_count(self):
        """Get count of enrolled students"""
        return self.enrollments.filter(is_active=True).count()
    
    def get_topics_count(self):
        """Get count of topics in course"""
        return self.topics.count()
    
    def get_total_quizzes_count(self):
        """Get total quizzes across all topics"""
        try:
            from quizzes.models import Quiz
            return Quiz.objects.filter(topic__course=self).count()
        except ImportError:
            return 0
    
    def __str__(self):
        return f"{self.code} - {self.name}"


class CourseEnrollment(models.Model):
    """Student enrollment in courses"""
    id = models.AutoField(primary_key=True)
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        limit_choices_to={'user_type': 'student'},
        related_name='course_enrollments'
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='enrollments'
    )
    enrolled_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ('student', 'course')
        ordering = ['-enrolled_at']
    
    def __str__(self):
        return f"{self.student.get_full_name()} enrolled in {self.course.code}"


class Topic(models.Model):
    """Course topics/modules"""
    id = models.AutoField(primary_key=True)
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='topics'
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['created_at']
        unique_together = ('course', 'name')
    
    def get_quizzes_count(self):
        """Get count of quizzes in topic"""
        try:
            from quizzes.models import Quiz
            return Quiz.objects.filter(topic=self).count()
        except ImportError:
            return 0
    
    def __str__(self):
        return f"{self.course.code} - {self.name}"


class Attendance(models.Model):
    """Student attendance tracking"""
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        limit_choices_to={'user_type': 'student'},
        related_name='attendance_records'
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='attendance_records'
    )
    date = models.DateField(default=timezone.now)
    is_present = models.BooleanField(default=False)
    verified_by_quiz = models.BooleanField(default=False)
    quiz_attempt = models.ForeignKey(
        'quizzes.QuizAttempt',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='attendance_record'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('student', 'course', 'date')
        ordering = ['-date', 'student__first_name']
    
    def __str__(self):
        status = "Present" if self.is_present else "Absent"
        return f"{self.student.get_full_name()} - {self.course.code} - {self.date} ({status})"