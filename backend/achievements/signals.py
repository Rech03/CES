from django.db.models.signals import post_save
from django.dispatch import receiver
from users.models import User
from .services import AchievementService

@receiver(post_save, sender=User)
def create_student_achievement(sender, instance, created, **kwargs):
    """Create StudentAchievement record when a new student is created"""
    if created and instance.user_type == 'student':
        # This will automatically create the achievement record when needed
        AchievementService.ensure_student_achievement_exists(instance)