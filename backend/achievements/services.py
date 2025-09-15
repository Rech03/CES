from django.utils import timezone
from django.db.models import Avg, Count
from datetime import timedelta

from .models import StudentAchievement, BadgeType, EarnedBadge, DailyActivity
from quizzes.models import QuizAttempt


class AchievementService:
    """Service class for handling achievement logic"""
    
    @classmethod
    def check_and_award_badges(cls, student):
        """Check all badge criteria and award new badges to student"""
        newly_earned = []
        
        # Get student's achievement record
        achievement, created = StudentAchievement.objects.get_or_create(student=student)
        if created:
            achievement.update_stats()
        
        # Get all active badge types that student hasn't earned yet
        earned_badge_ids = EarnedBadge.objects.filter(
            student=student
        ).values_list('badge_type_id', flat=True)
        
        available_badges = BadgeType.objects.filter(
            is_active=True
        ).exclude(id__in=earned_badge_ids)
        
        for badge_type in available_badges:
            if cls._check_badge_criteria(student, badge_type, achievement):
                # Award the badge
                earned_badge = EarnedBadge.objects.create(
                    student=student,
                    badge_type=badge_type
                )
                
                # Add XP reward
                achievement.add_xp(badge_type.xp_reward)
                
                # Update badge count
                achievement.badges_earned += 1
                achievement.save()
                
                newly_earned.append(earned_badge)
        
        return newly_earned
    
    @classmethod
    def _check_badge_criteria(cls, student, badge_type, achievement):
        """Check if student meets criteria for specific badge"""
        
        # Performance badges - based on score requirements
        if badge_type.required_score is not None:
            if achievement.average_score < badge_type.required_score:
                return False
        
        # Streak badges - based on consecutive days
        if badge_type.required_streak is not None:
            if achievement.current_streak < badge_type.required_streak:
                return False
        
        # Completion badges - based on number of quizzes
        if badge_type.required_quizzes is not None:
            if achievement.total_quizzes_completed < badge_type.required_quizzes:
                return False
        
        # Perfect score badges - based on number of 100% scores
        if badge_type.required_perfect_scores is not None:
            if achievement.perfect_scores < badge_type.required_perfect_scores:
                return False
        
        return True
    
    @classmethod
    def get_badge_progress(cls, student, badge_type):
        """Get student's progress towards earning a specific badge"""
        achievement, created = StudentAchievement.objects.get_or_create(student=student)
        if created:
            achievement.update_stats()
        
        progress_data = {
            'current_value': 0,
            'required_value': 0,
            'percentage': 0,
            'is_completed': False,
            'criteria_type': None
        }
        
        # Check which criteria applies to this badge
        if badge_type.required_score is not None:
            progress_data['criteria_type'] = 'average_score'
            progress_data['current_value'] = achievement.average_score
            progress_data['required_value'] = badge_type.required_score
            progress_data['percentage'] = min(
                (achievement.average_score / badge_type.required_score) * 100, 100
            )
            progress_data['is_completed'] = achievement.average_score >= badge_type.required_score
        
        elif badge_type.required_streak is not None:
            progress_data['criteria_type'] = 'streak'
            progress_data['current_value'] = achievement.current_streak
            progress_data['required_value'] = badge_type.required_streak
            progress_data['percentage'] = min(
                (achievement.current_streak / badge_type.required_streak) * 100, 100
            )
            progress_data['is_completed'] = achievement.current_streak >= badge_type.required_streak
        
        elif badge_type.required_quizzes is not None:
            progress_data['criteria_type'] = 'total_quizzes'
            progress_data['current_value'] = achievement.total_quizzes_completed
            progress_data['required_value'] = badge_type.required_quizzes
            progress_data['percentage'] = min(
                (achievement.total_quizzes_completed / badge_type.required_quizzes) * 100, 100
            )
            progress_data['is_completed'] = achievement.total_quizzes_completed >= badge_type.required_quizzes
        
        elif badge_type.required_perfect_scores is not None:
            progress_data['criteria_type'] = 'perfect_scores'
            progress_data['current_value'] = achievement.perfect_scores
            progress_data['required_value'] = badge_type.required_perfect_scores
            progress_data['percentage'] = min(
                (achievement.perfect_scores / badge_type.required_perfect_scores) * 100, 100
            )
            progress_data['is_completed'] = achievement.perfect_scores >= badge_type.required_perfect_scores
        
        return progress_data
    
    @classmethod
    def get_badge_requirements(cls, badge_type):
        """Get human-readable requirements for a badge"""
        requirements = []
        
        if badge_type.required_score is not None:
            requirements.append(f"Maintain an average score of {badge_type.required_score}%")
        
        if badge_type.required_streak is not None:
            requirements.append(f"Study for {badge_type.required_streak} consecutive days")
        
        if badge_type.required_quizzes is not None:
            requirements.append(f"Complete {badge_type.required_quizzes} quizzes")
        
        if badge_type.required_perfect_scores is not None:
            requirements.append(f"Score 100% on {badge_type.required_perfect_scores} quizzes")
        
        return requirements
    
    @classmethod
    def process_quiz_completion(cls, student, quiz_attempt):
        """Process achievement updates when student completes a quiz"""
        # Update achievement stats
        achievement, created = StudentAchievement.objects.get_or_create(student=student)
        achievement.update_stats()
        achievement.update_streak()
        
        # Calculate XP based on performance
        base_xp = 50  # Base XP for completing any quiz
        score_bonus = int(quiz_attempt.score_percentage * 2)  # Up to 200 XP for perfect score
        time_bonus = cls._calculate_time_bonus(quiz_attempt)
        
        total_xp = base_xp + score_bonus + time_bonus
        achievement.add_xp(total_xp)
        
        # Update daily activity
        today = timezone.now().date()
        daily_activity, created = DailyActivity.objects.get_or_create(
            student=student,
            date=today,
            defaults={
                'quizzes_completed': 0,
                'xp_earned': 0,
                'study_time': timedelta()
            }
        )
        
        daily_activity.quizzes_completed += 1
        daily_activity.xp_earned += total_xp
        if quiz_attempt.time_taken:
            daily_activity.study_time += quiz_attempt.time_taken
        daily_activity.save()
        
        # Check for new badges
        new_badges = cls.check_and_award_badges(student)
        
        return {
            'xp_earned': total_xp,
            'total_xp': achievement.total_xp,
            'level': achievement.level,
            'new_badges': new_badges,
            'streak': achievement.current_streak
        }
    
    @classmethod
    def _calculate_time_bonus(cls, quiz_attempt):
        """Calculate time bonus for quiz completion speed"""
        if not quiz_attempt.time_taken:
            return 0
        
        # Get average time for this quiz
        avg_time = QuizAttempt.objects.filter(
            quiz=quiz_attempt.quiz,
            is_completed=True,
            time_taken__isnull=False
        ).aggregate(avg=Avg('time_taken'))['avg']
        
        if not avg_time:
            return 10  # Default bonus if no average available
        
        # Bonus for completing faster than average
        time_ratio = quiz_attempt.time_taken.total_seconds() / avg_time.total_seconds()
        
        if time_ratio < 0.8:  # Completed in less than 80% of average time
            return 25
        elif time_ratio < 0.9:  # Completed in less than 90% of average time
            return 15
        elif time_ratio < 1.0:  # Completed faster than average
            return 10
        else:
            return 5  # Small bonus for completion
    
    @classmethod
    def ensure_student_achievement_exists(cls, student):
        """Ensure StudentAchievement record exists for student"""
        achievement, created = StudentAchievement.objects.get_or_create(student=student)
        if created:
            achievement.update_stats()
        return achievement