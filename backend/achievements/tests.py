from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.utils import timezone
from users.models import User
from courses.models import Course, Topic, CourseEnrollment
from .models import BadgeType, EarnedBadge, StudentAchievement
from .services import AchievementService

class AchievementIntegrationTest(APITestCase):
    """Test Cases 8 & 9 - Achievement system functionality"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create student
        self.student = User.objects.create_user(
            username='teststudent',
            email='student@test.com',
            password='testpass123',
            user_type='student',
            student_number='STU001'
        )
        
        # Create lecturer and course structure
        self.lecturer = User.objects.create_user(
            username='testlecturer',
            email='lecturer@test.com',
            password='testpass123',
            user_type='lecturer',
            employee_id='LEC001'
        )
        
        self.course = Course.objects.create(
            name='Test Course',
            code='TEST101',
            lecturer=self.lecturer
        )
        
        self.topic = Topic.objects.create(
            course=self.course,
            name='Test Topic'
        )
        
        CourseEnrollment.objects.create(
            student=self.student,
            course=self.course,
            is_active=True
        )
        
        # Create consistency badge (5 quizzes with 80%+)
        self.consistency_badge = BadgeType.objects.create(
            name='Consistency Master',
            description='Complete 5 quizzes with 80% or higher',
            category='performance',
            rarity='earned',
            icon='trophy',
            color='#ffd700',
            xp_reward=200,
            required_quizzes=5,
            required_score=80.0
        )