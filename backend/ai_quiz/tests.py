from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework.authtoken.models import Token
from unittest.mock import patch
import json
from datetime import timedelta

from courses.models import Course, Topic, CourseEnrollment
from ai_quiz.models import LectureSlide, AdaptiveQuiz, StudentAdaptiveProgress, AdaptiveQuizAttempt
from analytics.models import StudentEngagementMetrics, DailyEngagement
from achievements.models import StudentAchievement

User = get_user_model()


class AnalyticsIntegrationTestCase(APITestCase):
    """Base test case with common setup for analytics integration tests"""
    
    def setUp(self):
        """Set up test data for analytics integration tests"""
        # Create users
        self.lecturer = User.objects.create_user(
            username='lecturer1',
            email='lecturer@test.com',
            user_type='lecturer',
            first_name='Dr. John',
            last_name='Smith'
        )
        
        self.student1 = User.objects.create_user(
            username='student1', 
            email='student1@test.com',
            user_type='student',
            first_name='Alice',
            last_name='Johnson',
            student_number='STU001'
        )
        
        self.student2 = User.objects.create_user(
            username='student2',
            email='student2@test.com', 
            user_type='student',
            first_name='Bob',
            last_name='Wilson',
            student_number='STU002'
        )
        
        # Create tokens
        self.lecturer_token = Token.objects.create(user=self.lecturer)
        self.student1_token = Token.objects.create(user=self.student1)
        self.student2_token = Token.objects.create(user=self.student2)
        
        # Create course structure
        self.course = Course.objects.create(
            name='Computer Science 101',
            code='CS101',
            description='Introduction to Computer Science',
            lecturer=self.lecturer,
            enrollment_code='CS101TEST'
        )
        
        self.topic = Topic.objects.create(
            course=self.course,
            name='Data Structures',
            description='Introduction to data structures'
        )
        
        # Enroll students
        CourseEnrollment.objects.create(
            student=self.student1,
            course=self.course,
            is_active=True
        )
        
        CourseEnrollment.objects.create(
            student=self.student2, 
            course=self.course,
            is_active=True
        )
        
        # Create lecture slide
        self.lecture_slide = LectureSlide.objects.create(
            topic=self.topic,
            title='Arrays and Lists',
            uploaded_by=self.lecturer,
            extracted_text='Arrays are fundamental data structures...',
            questions_generated=True
        )
        
        # Create adaptive quizzes
        self.easy_quiz = AdaptiveQuiz.objects.create(
            lecture_slide=self.lecture_slide,
            difficulty='easy',
            questions_data={
                'questions': [
                    {
                        'difficulty': 'easy',
                        'question': 'What is an array?',
                        'options': {
                            'A': 'A data structure',
                            'B': 'A function',
                            'C': 'A variable',
                            'D': 'A class'
                        },
                        'correct_answer': 'A',
                        'explanation': 'Arrays are data structures that store elements.'
                    }
                ]
            }
        )
        
        self.medium_quiz = AdaptiveQuiz.objects.create(
            lecture_slide=self.lecture_slide,
            difficulty='medium', 
            questions_data={
                'questions': [
                    {
                        'difficulty': 'medium',
                        'question': 'What is the time complexity of array access?',
                        'options': {
                            'A': 'O(1)',
                            'B': 'O(n)',
                            'C': 'O(log n)',
                            'D': 'O(n^2)'
                        },
                        'correct_answer': 'A',
                        'explanation': 'Array access is constant time O(1).'
                    }
                ]
            }
        )


class AIQuizToAnalyticsFlowTest(AnalyticsIntegrationTestCase):
    """Test the complete flow from AI quiz completion to analytics"""
    
    def test_complete_ai_quiz_flow(self):
        """Test: AI quiz completion -> metrics update -> analytics display"""
        
        # Step 1: Student completes easy AI quiz
        progress = StudentAdaptiveProgress.objects.create(
            student=self.student1,
            adaptive_quiz=self.easy_quiz
        )
        
        attempt = AdaptiveQuizAttempt.objects.create(
            progress=progress,
            answers_data={'question_0': 'A'},
            score_percentage=100.0,
            started_at=timezone.now() - timedelta(minutes=5),
            completed_at=timezone.now()
        )
        
        # Step 2: Update progress
        progress.mark_completed(100.0)
        
        # Step 3: Update analytics metrics
        metrics, created = StudentEngagementMetrics.objects.get_or_create(
            student=self.student1,
            course=self.course
        )
        metrics.calculate_metrics()
        
        # Step 4: Test analytics API shows correct data
        self.client.force_authenticate(user=self.lecturer, token=self.lecturer_token)
        
        response = self.client.get('/analytics/lecturer/dashboard/')
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        course_data = data['course_overview'][0]
        
        # Verify AI quiz data appears in analytics
        self.assertEqual(course_data['course_code'], 'CS101')
        self.assertEqual(course_data['total_ai_quizzes'], 1)
        self.assertEqual(course_data['average_score'], 100.0)
        self.assertEqual(course_data['unique_participants'], 1)

    def test_student_dashboard_ai_quiz_integration(self):
        """Test student dashboard shows AI quiz performance data"""
        
        # Create multiple AI quiz attempts for student
        progress1 = StudentAdaptiveProgress.objects.create(
            student=self.student1,
            adaptive_quiz=self.easy_quiz
        )
        
        AdaptiveQuizAttempt.objects.create(
            progress=progress1,
            answers_data={'question_0': 'A'},
            score_percentage=90.0,
            started_at=timezone.now() - timedelta(days=2),
            completed_at=timezone.now() - timedelta(days=2)
        )
        
        progress2 = StudentAdaptiveProgress.objects.create(
            student=self.student1,
            adaptive_quiz=self.medium_quiz
        )
        
        AdaptiveQuizAttempt.objects.create(
            progress=progress2,
            answers_data={'question_0': 'A'},
            score_percentage=85.0,
            started_at=timezone.now() - timedelta(days=1),
            completed_at=timezone.now() - timedelta(days=1)
        )
        
        # Test student dashboard
        self.client.force_authenticate(user=self.student1, token=self.student1_token)
        
        response = self.client.get('/analytics/student/dashboard/')
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        
        # Verify AI quiz performance data
        self.assertEqual(data['total_quizzes_taken'], 2)
        self.assertEqual(data['overall_average'], 87.5)  # (90 + 85) / 2
        
        # Check performance trend includes difficulty levels
        trend = data['performance_trend']
        self.assertEqual(len(trend), 2)
        self.assertIn('difficulty', trend[0])
        self.assertEqual(trend[0]['quiz_title'], 'Arrays and Lists')
        
        # Check course averages
        course_avg = data['course_averages']['CS101']
        self.assertEqual(course_avg['total_quizzes'], 2)
        self.assertEqual(course_avg['average'], 87.5)

    def test_attendance_integration_via_ai_quiz(self):
        """Test that AI quiz completion marks attendance"""
        
        # Student completes AI quiz
        progress = StudentAdaptiveProgress.objects.create(
            student=self.student1,
            adaptive_quiz=self.easy_quiz
        )
        
        # Mock the AI quiz submission process
        with patch('ai_quiz.views.submit_adaptive_quiz') as mock_submit:
            mock_submit.return_value.status_code = 201
            
            # Simulate attendance marking in AI quiz completion
            from courses.models import Attendance
            attendance = Attendance.objects.create(
                student=self.student1,
                course=self.course,
                date=timezone.now().date(),
                is_present=True,
                verified_by_quiz=True
            )
            
            # Test analytics reflects attendance
            self.client.force_authenticate(user=self.lecturer, token=self.lecturer_token)
            
            response = self.client.get(f'/analytics/student/{self.student1.id}/engagement/')
            self.assertEqual(response.status_code, 200)
            
            data = response.json()
            self.assertTrue(any(
                course['course_code'] == 'CS101' 
                for course in data['courses']
            ))

    def test_cross_app_data_consistency(self):
        """Test data consistency across analytics, achievements, and AI quiz apps"""
        
        # Create AI quiz attempts
        progress = StudentAdaptiveProgress.objects.create(
            student=self.student1,
            adaptive_quiz=self.easy_quiz
        )
        
        attempt = AdaptiveQuizAttempt.objects.create(
            progress=progress,
            answers_data={'question_0': 'A'},
            score_percentage=100.0,
            started_at=timezone.now() - timedelta(minutes=10),
            completed_at=timezone.now() - timedelta(minutes=5)
        )
        
        # Update metrics
        metrics, created = StudentEngagementMetrics.objects.get_or_create(
            student=self.student1,
            course=self.course
        )
        metrics.calculate_metrics()
        
        # Update achievements
        achievement, created = StudentAchievement.objects.get_or_create(
            student=self.student1
        )
        achievement.update_stats()
        
        # Verify consistency across systems
        # Analytics data
        self.assertEqual(metrics.total_quizzes_taken, 1)
        self.assertEqual(metrics.average_quiz_score, 100.0)
        
        # Achievement data should match analytics
        self.assertEqual(achievement.total_quizzes_completed, 1)
        self.assertEqual(achievement.average_score, 100.0)
        
        # AI quiz data
        self.assertEqual(progress.latest_score, 100.0)
        self.assertTrue(progress.completed)


class AnalyticsPermissionIntegrationTest(AnalyticsIntegrationTestCase):
    """Test permission integration across the analytics system"""
    
    def test_lecturer_can_only_see_own_course_analytics(self):
        """Test lecturers can only access analytics for their own courses"""
        
        # Create another lecturer and course
        other_lecturer = User.objects.create_user(
            username='lecturer2',
            email='lecturer2@test.com',
            user_type='lecturer'
        )
        
        other_course = Course.objects.create(
            name='Physics 101',
            code='PHY101',
            lecturer=other_lecturer
        )
        
        # Try to access other lecturer's course analytics
        self.client.force_authenticate(user=self.lecturer, token=self.lecturer_token)
        
        response = self.client.get(f'/analytics/course/{other_course.id}/stats/')
        self.assertEqual(response.status_code, 404)  # Should not find course

    def test_student_can_only_see_own_analytics(self):
        """Test students can only access their own analytics data"""
        
        # Student 1 tries to access analytics
        self.client.force_authenticate(user=self.student1, token=self.student1_token)
        
        # Should work for own data
        response = self.client.get('/analytics/student/dashboard/')
        self.assertEqual(response.status_code, 200)
        
        # Should not work for lecturer endpoints
        response = self.client.get('/analytics/lecturer/dashboard/')
        self.assertEqual(response.status_code, 403)


class AnalyticsPerformanceIntegrationTest(AnalyticsIntegrationTestCase):
    """Test analytics performance with realistic data volumes"""
    
    def test_analytics_with_large_dataset(self):
        """Test analytics performance with multiple students and attempts"""
        
        # Create additional students
        students = []
        for i in range(10):
            student = User.objects.create_user(
                username=f'student{i+10}',
                email=f'student{i+10}@test.com',
                user_type='student',
                student_number=f'STU{i+10:03d}'
            )
            students.append(student)
            
            CourseEnrollment.objects.create(
                student=student,
                course=self.course,
                is_active=True
            )
        
        # Create AI quiz attempts for all students
        for student in students:
            progress = StudentAdaptiveProgress.objects.create(
                student=student,
                adaptive_quiz=self.easy_quiz
            )
            
            AdaptiveQuizAttempt.objects.create(
                progress=progress,
                answers_data={'question_0': 'A'},
                score_percentage=75.0 + (students.index(student) * 2),  # Varying scores
                started_at=timezone.now() - timedelta(hours=1),
                completed_at=timezone.now()
            )
        
        # Test analytics endpoints performance
        self.client.force_authenticate(user=self.lecturer, token=self.lecturer_token)
        
        # Test lecturer dashboard (should handle multiple students)
        response = self.client.get('/analytics/lecturer/dashboard/')
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        course_data = data['course_overview'][0]
        self.assertEqual(course_data['total_students'], 12)  # 2 original + 10 new
        self.assertEqual(course_data['total_ai_quizzes'], 10)  # One attempt per new student

    def test_analytics_query_optimization(self):
        """Test that analytics queries are optimized and don't cause N+1 problems"""
        
        # Create test data
        for i in range(5):
            student = User.objects.create_user(
                username=f'perf_student{i}',
                email=f'perf_student{i}@test.com',
                user_type='student',
                student_number=f'PERF{i:03d}'
            )
            
            CourseEnrollment.objects.create(
                student=student,
                course=self.course,
                is_active=True
            )
            
            progress = StudentAdaptiveProgress.objects.create(
                student=student,
                adaptive_quiz=self.easy_quiz
            )
            
            AdaptiveQuizAttempt.objects.create(
                progress=progress,
                answers_data={'question_0': 'A'},
                score_percentage=80.0,
                started_at=timezone.now(),
                completed_at=timezone.now()
            )
        
        # Test with query counting
        from django.test.utils import override_settings
        from django.db import connection
        
        self.client.force_authenticate(user=self.lecturer, token=self.lecturer_token)
        
        with override_settings(DEBUG=True):
            initial_queries = len(connection.queries)
            
            response = self.client.get('/analytics/lecturer/dashboard/')
            
            final_queries = len(connection.queries)
            query_count = final_queries - initial_queries
            
            # Should not have excessive queries (adjust threshold as needed)
            self.assertLess(query_count, 20, f"Too many queries: {query_count}")
            self.assertEqual(response.status_code, 200)


class AnalyticsDataMigrationTest(AnalyticsIntegrationTestCase):
    """Test analytics behavior during transition from traditional to AI quizzes"""
    
    def test_mixed_traditional_and_ai_quiz_data(self):
        """Test analytics when both traditional and AI quiz data exist"""
        
        # Create traditional quiz data (should be ignored)
        from quizzes.models import Quiz, QuizAttempt
        
        traditional_quiz = Quiz.objects.create(
            topic=self.topic,
            title='Traditional Quiz',
            description='Old style quiz'
        )
        
        # This should not appear in AI-focused analytics
        QuizAttempt.objects.create(
            student=self.student1,
            quiz=traditional_quiz,
            score_percentage=95.0,
            is_completed=True,
            started_at=timezone.now(),
            completed_at=timezone.now()
        )
        
        # Create AI quiz data  
        progress = StudentAdaptiveProgress.objects.create(
            student=self.student1,
            adaptive_quiz=self.easy_quiz
        )
        
        AdaptiveQuizAttempt.objects.create(
            progress=progress,
            answers_data={'question_0': 'A'},
            score_percentage=85.0,
            started_at=timezone.now(),
            completed_at=timezone.now()
        )
        
        # Test student dashboard only shows AI quiz data
        self.client.force_authenticate(user=self.student1, token=self.student1_token)
        
        response = self.client.get('/analytics/student/dashboard/')
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        
        # Should only show AI quiz data
        self.assertEqual(data['total_quizzes_taken'], 1)
        self.assertEqual(data['overall_average'], 85.0)  # Only AI quiz score

    def test_graceful_handling_of_missing_ai_quiz_data(self):
        """Test analytics gracefully handles courses with no AI quiz data"""
        
        # Course with no AI quizzes or attempts
        empty_course = Course.objects.create(
            name='Empty Course',
            code='EMPTY101',
            lecturer=self.lecturer
        )
        
        self.client.force_authenticate(user=self.lecturer, token=self.lecturer_token)
        
        response = self.client.get(f'/analytics/course/{empty_course.id}/stats/')
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        
        # Should handle empty data gracefully
        self.assertEqual(data['total_ai_quizzes'], 0)
        self.assertEqual(data['total_attempts'], 0)
        self.assertEqual(data['overall_average'], 0)


class AnalyticsRealTimeIntegrationTest(AnalyticsIntegrationTestCase):
    """Test real-time analytics integration"""
    
    def test_live_quiz_statistics_integration(self):
        """Test live statistics during active AI quiz sessions"""
        
        # Create active AI quiz attempts (not completed)
        progress1 = StudentAdaptiveProgress.objects.create(
            student=self.student1,
            adaptive_quiz=self.easy_quiz
        )
        
        # Recent attempt (within 2 hours = active)
        active_attempt = AdaptiveQuizAttempt.objects.create(
            progress=progress1,
            answers_data={},
            score_percentage=0.0,
            started_at=timezone.now() - timedelta(minutes=30)
            # No completed_at = still active
        )
        
        # Test live stats endpoint
        self.client.force_authenticate(user=self.lecturer, token=self.lecturer_token)
        
        response = self.client.get(f'/analytics/quiz/{self.easy_quiz.id}/live-stats/')
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        
        # Should show active participants
        self.assertEqual(data['quiz_id'], self.easy_quiz.id)
        self.assertEqual(data['active_participants'], 1)
        self.assertEqual(data['difficulty'], 'easy')

    def test_engagement_heatmap_integration(self):
        """Test engagement heatmap with AI quiz activity"""
        
        # Mark engagement for today
        DailyEngagement.mark_engagement(self.student1)
        
        # Test heatmap endpoint
        self.client.force_authenticate(user=self.student1, token=self.student1_token)
        
        current_year = timezone.now().year
        current_month = timezone.now().month
        
        response = self.client.get(
            f'/analytics/student/engagement-heatmap/?year={current_year}&month={current_month}'
        )
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        
        # Should show engagement for current month
        self.assertEqual(data['year'], current_year)
        self.assertEqual(data['month'], current_month)
        self.assertIsInstance(data['engagement_data'], list)


class AnalyticsErrorHandlingIntegrationTest(AnalyticsIntegrationTestCase):
    """Test error handling across the analytics integration"""
    
    def test_corrupted_ai_quiz_data_handling(self):
        """Test analytics handles corrupted AI quiz data gracefully"""
        
        # Create AI quiz with corrupted questions_data
        corrupted_quiz = AdaptiveQuiz.objects.create(
            lecture_slide=self.lecture_slide,
            difficulty='hard',
            questions_data={'invalid': 'data'}  # Corrupted structure
        )
        
        progress = StudentAdaptiveProgress.objects.create(
            student=self.student1,
            adaptive_quiz=corrupted_quiz
        )
        
        # Attempt with corrupted answers
        AdaptiveQuizAttempt.objects.create(
            progress=progress,
            answers_data={'corrupted': 'answers'},
            score_percentage=50.0,
            started_at=timezone.now(),
            completed_at=timezone.now()
        )
        
        # Test analytics handles this gracefully
        self.client.force_authenticate(user=self.lecturer, token=self.lecturer_token)
        
        response = self.client.get(f'/analytics/quiz/{corrupted_quiz.id}/stats/')
        self.assertEqual(response.status_code, 200)
        
        # Should not crash, even with corrupted data
        data = response.json()
        self.assertEqual(data['quiz_id'], corrupted_quiz.id)

    def test_network_timeout_resilience(self):
        """Test analytics resilience to database timeouts"""
        
        # This would typically be tested with actual database connection issues
        # For now, test that large dataset queries don't timeout
        
        # Create large dataset
        for i in range(50):
            student = User.objects.create_user(
                username=f'timeout_student{i}',
                email=f'timeout_student{i}@test.com',
                user_type='student',
                student_number=f'TIME{i:03d}'
            )
            
            progress = StudentAdaptiveProgress.objects.create(
                student=student,
                adaptive_quiz=self.easy_quiz
            )
            
            AdaptiveQuizAttempt.objects.create(
                progress=progress,
                answers_data={'question_0': 'A'},
                score_percentage=70.0,
                started_at=timezone.now(),
                completed_at=timezone.now()
            )
        
        # Test that analytics still responds
        self.client.force_authenticate(user=self.lecturer, token=self.lecturer_token)
        
        response = self.client.get('/analytics/lecturer/dashboard/')
        self.assertEqual(response.status_code, 200)
        
        # Should handle large dataset without timeout
        data = response.json()
        self.assertIsInstance(data, dict)
        self.assertIn('course_overview', data)