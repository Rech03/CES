from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):

    USER_TYPE_CHOICES = [
        ('student', 'Student'),
        ('lecturer', 'Lecturer'),
        ('admin', 'Admin'),
    ]
    
    # Basic fields
    email = models.EmailField(unique=True)
    user_type = models.CharField(max_length=10, choices=USER_TYPE_CHOICES)
    
    # Profile picture
    profile_picture = models.ImageField(
        upload_to='profile_pictures/', 
        null=True, 
        blank=True
    )
    
    # Student fields (only used when user_type='student')
    student_number = models.CharField(max_length=20, unique=True, null=True, blank=True)
    
    # Lecturer fields (only used when user_type='lecturer')
    employee_id = models.CharField(max_length=20, unique=True, null=True, blank=True)
    department = models.CharField(max_length=100, null=True, blank=True)
    
    # Admin fields (only used when user_type='admin')
    admin_level = models.CharField(
        max_length=20, 
        choices=[
            ('system', 'System Administrator'),
            ('academic', 'Academic Administrator'),
            ('support', 'Support Administrator'),
        ],
        null=True, 
        blank=True,
        help_text="Admin specialization level"
    )
    
    def save(self, *args, **kwargs):
        # Auto-set permissions based on user type
        if self.user_type == 'admin':
            self.is_staff = True
            self.is_superuser = True
        elif self.user_type == 'lecturer':
            self.is_staff = True
            self.is_superuser = False
        else:  # student
            self.is_staff = False
            self.is_superuser = False
        super().save(*args, **kwargs)
    
    @property
    def is_student(self):
        return self.user_type == 'student'
    
    @property
    def is_lecturer(self):
        return self.user_type == 'lecturer'
    
    @property
    def is_admin(self):
        return self.user_type == 'admin'
    
    def get_enrolled_courses(self):
        """For students - return enrolled courses"""
        if self.is_student:
            try:
                from courses.models import CourseEnrollment
                return CourseEnrollment.objects.filter(student=self)
            except ImportError:
                return self.__class__.objects.none()
        return self.__class__.objects.none()
    
    def __str__(self):
        if self.user_type == 'student':
            return f"Student: {self.get_full_name()} ({self.student_number})"
        elif self.user_type == 'lecturer':
            return f"Lecturer: {self.get_full_name()} ({self.employee_id})"
        elif self.user_type == 'admin':
            return f"Administrator: {self.get_full_name()}"
        return f"{self.get_full_name()} ({self.username})"


class StudentProfile(models.Model):
    """Student performance tracking - only for students"""
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='student_profile',
        limit_choices_to={'user_type': 'student'}
    )
    
    # Quiz performance statistics
    total_quizzes_completed = models.PositiveIntegerField(default=0)
    total_correct_answers = models.PositiveIntegerField(default=0)
    fastest_quiz_time = models.DurationField(null=True, blank=True)
    current_streak = models.PositiveIntegerField(default=0)
    longest_streak = models.PositiveIntegerField(default=0)
    
    def __str__(self):
        return f"Profile: {self.user.get_full_name()}"


# Auto-create StudentProfile for new students
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=User)
def create_student_profile(sender, instance, created, **kwargs):
    """Create StudentProfile for new students"""
    if created and instance.user_type == 'student':
        StudentProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_student_profile(sender, instance, **kwargs):
    """Save student profile when user is saved"""
    if instance.user_type == 'student' and hasattr(instance, 'student_profile'):
        instance.student_profile.save()