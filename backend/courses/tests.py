from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile
from io import StringIO
import csv
from users.models import User
from .models import Course, Topic, CourseEnrollment

class CSVUploadIntegrationTest(APITestCase):
    """Integration tests for CSV upload functionality - Test Cases 3 & 4"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create lecturer
        self.lecturer = User.objects.create_user(
            username='testlecturer',
            email='lecturer@test.com',
            password='testpass123',
            user_type='lecturer',
            employee_id='LEC001',
            first_name='Test',
            last_name='Lecturer'
        )
        
        # Create course and topic
        self.course = Course.objects.create(
            name='Test Course',
            code='TEST101',
            description='Test course description',
            lecturer=self.lecturer
        )
        
        self.topic = Topic.objects.create(
            course=self.course,
            name='Test Topic',
            description='Test topic description'
        )
        
        # Authenticate as lecturer
        self.client.force_authenticate(user=self.lecturer)
        
        self.upload_url = reverse('upload-students-csv', kwargs={'course_id': self.course.id})
    
    def create_test_csv(self, student_data):
        """Helper method to create CSV file for testing"""
        csv_buffer = StringIO()
        writer = csv.DictWriter(csv_buffer, fieldnames=['first_name', 'last_name', 'student_number', 'password'])
        writer.writeheader()
        writer.writerows(student_data)
        
        csv_content = csv_buffer.getvalue().encode('utf-8')
        return SimpleUploadedFile("students.csv", csv_content, content_type="text/csv")
    
    def test_course_enrollment_via_csv(self):
        """Test Case 3: Course enrollment via CSV"""
        print("\n=== Running Test Case 3: Course enrollment via CSV ===")
        
        # Prepare test data
        student_data = [
            {'first_name': 'John', 'last_name': 'Doe', 'student_number': 'STU001', 'password': 'password123'},
            {'first_name': 'Jane', 'last_name': 'Smith', 'student_number': 'STU002', 'password': 'password123'},
            {'first_name': 'Bob', 'last_name': 'Johnson', 'student_number': 'STU003', 'password': 'password123'},
        ]
        
        csv_file = self.create_test_csv(student_data)
        
        # Make request
        response = self.client.post(self.upload_url, {'csv_file': csv_file}, format='multipart')
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['created_students'], 3)
        self.assertEqual(response.data['updated_students'], 0)
        self.assertEqual(len(response.data['errors']), 0)
        
        # Verify students were created
        self.assertEqual(User.objects.filter(user_type='student').count(), 3)
        
        # Verify enrollments were created
        self.assertEqual(CourseEnrollment.objects.filter(course=self.course, is_active=True).count(), 3)
        
        # Check specific student creation
        john = User.objects.get(student_number='STU001')
        self.assertEqual(john.first_name, 'John')
        self.assertEqual(john.last_name, 'Doe')
        self.assertTrue(john.check_password('password123'))
        
        # Check enrollment
        self.assertTrue(CourseEnrollment.objects.filter(
            student=john, course=self.course, is_active=True
        ).exists())
        
        print(f"Status Code: {response.status_code}")
        print(f"Students Created: {response.data['created_students']}")
        print(f"Enrollments Created: {CourseEnrollment.objects.filter(course=self.course).count()}")
        print("TEST PASSED: CSV upload with valid students")
    
    def test_duplicate_student_in_csv_upload(self):
        """Test Case 4: Duplicate student in CSV upload"""
        print("\n=== Running Test Case 4: Duplicate student in CSV upload ===")
        
        # First, create a student that will be duplicated
        existing_student = User.objects.create_user(
            username='stu001',
            email='STU001@student.uct.ac.za',
            password='oldpassword',
            user_type='student',
            student_number='STU001',
            first_name='Original',
            last_name='Student'
        )
        
        # Prepare CSV with duplicate and new students
        student_data = [
            {'first_name': 'Updated', 'last_name': 'Student', 'student_number': 'STU001', 'password': 'newpassword123'},  # Duplicate
            {'first_name': 'Jane', 'last_name': 'Smith', 'student_number': 'STU002', 'password': 'password123'},      # New
            {'first_name': 'Bob', 'last_name': 'Johnson', 'student_number': 'STU003', 'password': 'password123'},     # New
        ]
        
        csv_file = self.create_test_csv(student_data)
        
        # Make request
        response = self.client.post(self.upload_url, {'csv_file': csv_file}, format='multipart')
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['created_students'], 2)  # 2 new students
        self.assertEqual(response.data['updated_students'], 1)  # 1 updated student
        
        # Verify duplicate was updated, not duplicated
        updated_student = User.objects.get(student_number='STU001')
        self.assertEqual(updated_student.first_name, 'Updated')
        self.assertEqual(updated_student.last_name, 'Student')
        self.assertTrue(updated_student.check_password('newpassword123'))  # Password was updated
        
        # Verify only 3 students total (not 4)
        self.assertEqual(User.objects.filter(user_type='student').count(), 3)
        
        print(f"Status Code: {response.status_code}")
        print(f"New Students Created: {response.data['created_students']}")
        print(f"Students Updated: {response.data['updated_students']}")
        print(f"Total Students: {User.objects.filter(user_type='student').count()}")
        print("TEST PASSED: Duplicate student handled correctly")
    
    def test_csv_upload_with_invalid_file_type(self):
        """Additional test: Upload non-CSV file"""
        print("\n=== Running Additional Test: Upload non-CSV file ===")
        
        # Create a text file instead of CSV
        txt_file = SimpleUploadedFile("students.txt", b"not a csv file", content_type="text/plain")
        
        response = self.client.post(self.upload_url, {'csv_file': txt_file}, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('File must be a CSV', response.data['error'])
        
        print(f"Status Code: {response.status_code}")
        print(f"Error Message: {response.data['error']}")
        print("TEST PASSED: Invalid file type rejected")
    
    def test_unauthorized_csv_upload(self):
        """Additional test: Unauthorized user trying to upload CSV"""
        print("\n=== Running Additional Test: Unauthorized CSV upload ===")
        
        # Create a student user (shouldn't be able to upload CSV)
        student = User.objects.create_user(
            username='student',
            email='student@test.com',
            password='testpass123',
            user_type='student',
            student_number='STU999'
        )
        
        # Authenticate as student
        self.client.force_authenticate(user=student)
        
        student_data = [
            {'first_name': 'John', 'last_name': 'Doe', 'student_number': 'STU001', 'password': 'password123'}
        ]
        csv_file = self.create_test_csv(student_data)
        
        response = self.client.post(self.upload_url, {'csv_file': csv_file}, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Only lecturers can upload student data', response.data['error'])
        
        print(f"Status Code: {response.status_code}")
        print(f"Error Message: {response.data['error']}")
        print("TEST PASSED: Unauthorized upload correctly blocked")