from django.utils import timezone
from django.db import models
from django.db.models import Avg, Count
from datetime import timedelta

from .models import StudentAchievement, BadgeType, EarnedBadge, DailyActivity


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
    def ensure_student_achievement_exists(cls, student):
        """Ensure StudentAchievement record exists for student"""
        achievement, created = StudentAchievement.objects.get_or_create(student=student)
        if created:
            achievement.update_stats()
        return achievement
    
    @classmethod
    def process_ai_quiz_completion(cls, student, adaptive_quiz_attempt):
        """Process achievement updates when student completes an AI quiz"""
        from ai_quiz.models import AdaptiveQuizAttempt
    
        # Update achievement stats
        achievement, created = StudentAchievement.objects.get_or_create(student=student)
        achievement.update_stats()
        achievement.update_streak()
    
        # Calculate XP based on AI quiz performance and difficulty
        base_xp = 50
    
        # Difficulty multipliers
        difficulty_multipliers = {
            'easy': 1.0,
            'medium': 1.5,
            'hard': 2.0
        }
    
        difficulty = adaptive_quiz_attempt.progress.adaptive_quiz.difficulty
        difficulty_bonus = base_xp * (difficulty_multipliers.get(difficulty, 1.0) - 1.0)
    
        # Score bonus (up to 200 XP for perfect score)
        score_bonus = int(adaptive_quiz_attempt.score_percentage * 2)
    
        # Time bonus for AI quizzes
        time_bonus = cls._calculate_ai_quiz_time_bonus(adaptive_quiz_attempt)
    
        total_xp = int(base_xp + difficulty_bonus + score_bonus + time_bonus)
        achievement.add_xp(total_xp)
    
        # Update daily activity for AI quizzes
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
        if adaptive_quiz_attempt.completed_at and adaptive_quiz_attempt.started_at:
            duration = adaptive_quiz_attempt.completed_at - adaptive_quiz_attempt.started_at
            daily_activity.study_time += duration
        daily_activity.save()
    
        # Check for new badges based on AI quiz performance
        new_badges = cls.check_and_award_ai_quiz_badges(student)
    
        return {
            'xp_earned': total_xp,
            'total_xp': achievement.total_xp,
            'level': achievement.level,
            'new_badges': new_badges,
            'streak': achievement.current_streak
        }

    @classmethod
    def _calculate_ai_quiz_time_bonus(cls, adaptive_quiz_attempt):
        """Calculate time bonus for AI quiz completion speed"""
        if not (adaptive_quiz_attempt.completed_at and adaptive_quiz_attempt.started_at):
            return 0
    
        # Get average time for this difficulty level
        from ai_quiz.models import AdaptiveQuizAttempt
    
        difficulty = adaptive_quiz_attempt.progress.adaptive_quiz.difficulty
        avg_time_attempts = AdaptiveQuizAttempt.objects.filter(
            progress__adaptive_quiz__difficulty=difficulty,
            completed_at__isnull=False,
            started_at__isnull=False
        ).exclude(id=adaptive_quiz_attempt.id)
    
        if not avg_time_attempts.exists():
            return 10
    
        # Calculate average time for this difficulty
        total_seconds = 0
        count = 0
        for attempt in avg_time_attempts:
            duration = attempt.completed_at - attempt.started_at
            total_seconds += duration.total_seconds()
            count += 1
    
        if count == 0:
            return 10
    
        avg_seconds = total_seconds / count
        attempt_duration = (adaptive_quiz_attempt.completed_at - adaptive_quiz_attempt.started_at).total_seconds()
    
        # Bonus for completing faster than average
        time_ratio = attempt_duration / avg_seconds
    
        if time_ratio < 0.7:
            return 30
        elif time_ratio < 0.8:
            return 20
        elif time_ratio < 0.9:
            return 15
        else:
            return 5

    @classmethod
    def check_and_award_ai_quiz_badges(cls, student):
        """Check and award badges specifically for AI quiz performance"""
        newly_earned = []
    
        # Get student's achievement record
        achievement, created = StudentAchievement.objects.get_or_create(student=student)
    
        # Get AI quiz specific stats
        from ai_quiz.models import AdaptiveQuizAttempt
        ai_attempts = AdaptiveQuizAttempt.objects.filter(
            progress__student=student
        )
    
        # Get badges not yet earned
        earned_badge_ids = EarnedBadge.objects.filter(
            student=student
        ).values_list('badge_type_id', flat=True)
    
        available_badges = BadgeType.objects.filter(
            is_active=True
        ).exclude(id__in=earned_badge_ids)
    
        for badge_type in available_badges:
            if cls._check_ai_quiz_badge_criteria(student, badge_type, achievement, ai_attempts):
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
    def _check_ai_quiz_badge_criteria(cls, student, badge_type, achievement, ai_attempts):
        """Check if student meets AI quiz badge criteria"""
    
        # Performance badges - based on AI quiz scores
        if badge_type.required_score is not None:
            if not ai_attempts.exists():
                return False
            avg_score = ai_attempts.aggregate(avg=models.Avg('score_percentage'))['avg'] or 0
            if avg_score < badge_type.required_score:
                return False
    
        # Completion badges - based on number of AI quizzes completed
        if badge_type.required_quizzes is not None:
            completed_count = ai_attempts.count()
            if completed_count < badge_type.required_quizzes:
                return False
    
        # Perfect score badges - based on perfect AI quiz scores
        if badge_type.required_perfect_scores is not None:
            perfect_count = ai_attempts.filter(score_percentage=100).count()
            if perfect_count < badge_type.required_perfect_scores:
                return False
    
        # Streak badges - same as before (based on daily activity)
        if badge_type.required_streak is not None:
            if achievement.current_streak < badge_type.required_streak:
                return False
    
        return True