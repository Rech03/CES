from django.db.models.signals import post_save
from django.dispatch import receiver
from users.models import User
from .services import AchievementService


# @receiver(post_save, sender=AdaptiveQuizAttempt)
# def handle_quiz_completion(sender, instance, created, **kwargs):
#     """Handle achievement updates when a quiz is completed"""
#     # Only process when quiz attempt is marked as completed
#     if instance.is_completed and instance.student.user_type == 'student':
#         # Process achievements for the student
#         achievement_result = AchievementService.process_quiz_completion(
#             instance.student, 
#             instance
#         )


@receiver(post_save, sender=User)
def create_student_achievement(sender, instance, created, **kwargs):
    """Create StudentAchievement record when a new student is created"""
    if created and instance.user_type == 'student':
        # This will automatically create the achievement record when needed
        AchievementService.ensure_student_achievement_exists(instance)