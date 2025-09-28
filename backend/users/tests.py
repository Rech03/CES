from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from .models import User, StudentProfile

class AuthenticationIntegrationTest(APITestCase):
    """Integration tests for user authentication - Test Cases 1 & 2"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create test users
        self.student_user = User.objects.create_user(
            username='teststudent',
            email='student@test.com',
            password='testpass123',
            user_type='student',
            student_number='STU001',
            first_name='Test',
            last_name='Student'
        )
        
        self.lecturer_user = User.objects.create_user(
            username='testlecturer',
            email='lecturer@test.com',
            password='testpass123',
            user_type='lecturer',
            employee_id='LEC001',
            department='Computer Science',
            first_name='Test',
            last_name='Lecturer'
        )
        
        self.login_url = reverse('login')
    
    def test_login_with_correct_credentials(self):
        """Test Case 1: Test login with correct credentials"""
        print("\n=== Running Test Case 1: Login with correct credentials ===")
        
        # Test data
        login_data = {
            'username': 'teststudent',
            'password': 'testpass123'
        }
        
        # Make request
        response = self.client.post(self.login_url, login_data, format='json')
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user_type'], 'student')
        self.assertEqual(response.data['message'], 'Login successful')
        
        print(f"Status Code: {response.status_code}")
        print(f"Token received: {'token' in response.data}")
        print(f"User type: {response.data.get('user_type')}")
        print("TEST PASSED: Login with correct credentials")
    
    def test_login_with_incorrect_credentials(self):
        """Test Case 2: Test login with incorrect credentials"""
        print("\n=== Running Test Case 2: Login with incorrect credentials ===")
        
        # Test data
        login_data = {
            'username': 'teststudent',
            'password': 'wrongpassword'
        }
        
        # Make request
        response = self.client.post(self.login_url, login_data, format='json')
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('non_field_errors', response.data)
        self.assertNotIn('token', response.data)
        
        print(f"Status Code: {response.status_code}")
        print(f"Error message present: {'non_field_errors' in response.data}")
        print(f"No token provided: {'token' not in response.data}")
        print("TEST PASSED: Login with incorrect credentials shows error")
    
    def test_dashboard_access_after_login(self):
        """Additional test: Dashboard access after login"""
        print("\n=== Running Additional Test: Dashboard access after login ===")
        
        # First, login
        login_data = {
            'username': 'teststudent',
            'password': 'testpass123'
        }
        login_response = self.client.post(self.login_url, login_data, format='json')
        token = login_response.data['token']
        
        # Set authentication header
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        
        # Access dashboard
        dashboard_url = reverse('dashboard_data')
        response = self.client.get(dashboard_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user_type'], 'student')
        
        print(f"Dashboard Status Code: {response.status_code}")
        print(f"User Type: {response.data.get('user_type')}")
        print("TEST PASSED: Dashboard accessible after login")

class UserModelTest(TestCase):
    """Test user model functionality"""
    
    def test_student_profile_creation(self):
        """Test that StudentProfile is automatically created for students"""
        print("\n=== Running Test: Student Profile Auto-Creation ===")
        
        student = User.objects.create_user(
            username='newstudent',
            email='newstudent@test.com',
            password='testpass123',
            user_type='student',
            student_number='STU002'
        )
        
        # Check that StudentProfile was created automatically
        self.assertTrue(hasattr(student, 'student_profile'))
        self.assertIsInstance(student.student_profile, StudentProfile)
        
        print(f"Student created: {student.username}")
        print(f"Profile created: {hasattr(student, 'student_profile')}")
        print("TEST PASSED: Student profile auto-creation works")