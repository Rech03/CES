# Analytics API Test Cases for AI Quiz System
# Run these tests to verify the updated analytics views work correctly

import requests
import json
from datetime import datetime, timedelta

# Base configuration
BASE_URL = "http://localhost:8000"  # Adjust to your server
HEADERS = {
    "Authorization": "Token YOUR_TOKEN_HERE",
    "Content-Type": "application/json"
}

# Test data - replace with actual IDs from your database
TEST_DATA = {
    "lecturer_token": "lecturer_token_here",
    "student_token": "student_token_here", 
    "course_id": 1,
    "topic_id": 1,
    "ai_quiz_id": 1,
    "student_id": 1
}

class AnalyticsTestRunner:
    def __init__(self, base_url, test_data):
        self.base_url = base_url
        self.test_data = test_data
        self.results = []

    def run_test(self, test_name, method, endpoint, headers=None, data=None, expected_status=200):
        """Run a single test case"""
        print(f"\n🧪 Testing: {test_name}")
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method == "GET":
                response = requests.get(url, headers=headers)
            elif method == "POST":
                response = requests.post(url, headers=headers, json=data)
            
            # Check status code
            status_ok = response.status_code == expected_status
            print(f"   Status: {response.status_code} ({'✅' if status_ok else '❌'})")
            
            # Parse response
            try:
                response_data = response.json()
                print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                
                # Store result
                self.results.append({
                    "test": test_name,
                    "status": response.status_code,
                    "success": status_ok,
                    "data": response_data
                })
                
            except json.JSONDecodeError:
                print(f"   Error: Invalid JSON response")
                self.results.append({
                    "test": test_name,
                    "status": response.status_code,
                    "success": False,
                    "error": "Invalid JSON"
                })
                
        except Exception as e:
            print(f"   Error: {str(e)}")
            self.results.append({
                "test": test_name,
                "status": 0,
                "success": False,
                "error": str(e)
            })

    def test_suite_1_basic_endpoints(self):
        """Test basic endpoint functionality"""
        print("\n" + "="*50)
        print("TEST SUITE 1: Basic Endpoint Functionality")
        print("="*50)
        
        lecturer_headers = {**HEADERS, "Authorization": f"Token {self.test_data['lecturer_token']}"}
        student_headers = {**HEADERS, "Authorization": f"Token {self.test_data['student_token']}"}
        
        # Test 1.1: Update student metrics (Lecturer)
        self.run_test(
            "Update Student Metrics",
            "POST",
            "/analytics/update-metrics/",
            lecturer_headers
        )
        
        # Test 1.2: Lecturer analytics dashboard
        self.run_test(
            "Lecturer Analytics Dashboard",
            "GET", 
            "/analytics/lecturer/dashboard/",
            lecturer_headers
        )
        
        # Test 1.3: Student analytics dashboard
        self.run_test(
            "Student Analytics Dashboard",
            "GET",
            "/analytics/student/dashboard/",
            student_headers
        )
        
        # Test 1.4: Student engagement heatmap
        current_year = datetime.now().year
        current_month = datetime.now().month
        self.run_test(
            "Student Engagement Heatmap",
            "GET",
            f"/analytics/student/engagement-heatmap/?year={current_year}&month={current_month}",
            student_headers
        )
        
        # Test 1.5: Lecturer course options
        self.run_test(
            "Lecturer Course Options",
            "GET",
            "/analytics/lecturer/course-options/",
            lecturer_headers
        )

    def test_suite_2_detailed_analytics(self):
        """Test detailed analytics endpoints"""
        print("\n" + "="*50)
        print("TEST SUITE 2: Detailed Analytics")
        print("="*50)
        
        lecturer_headers = {**HEADERS, "Authorization": f"Token {self.test_data['lecturer_token']}"}
        
        # Test 2.1: AI Quiz statistics
        self.run_test(
            "AI Quiz Statistics",
            "GET",
            f"/analytics/quiz/{self.test_data['ai_quiz_id']}/stats/",
            lecturer_headers
        )
        
        # Test 2.2: Topic statistics  
        self.run_test(
            "Topic Statistics",
            "GET",
            f"/analytics/topic/{self.test_data['topic_id']}/stats/",
            lecturer_headers
        )
        
        # Test 2.3: Course statistics
        self.run_test(
            "Course Statistics", 
            "GET",
            f"/analytics/course/{self.test_data['course_id']}/stats/",
            lecturer_headers
        )
        
        # Test 2.4: Student engagement detail
        self.run_test(
            "Student Engagement Detail",
            "GET",
            f"/analytics/student/{self.test_data['student_id']}/engagement/",
            lecturer_headers
        )

    def test_suite_3_chart_analytics(self):
        """Test chart generation endpoints"""
        print("\n" + "="*50)
        print("TEST SUITE 3: Chart Analytics")
        print("="*50)
        
        lecturer_headers = {**HEADERS, "Authorization": f"Token {self.test_data['lecturer_token']}"}
        
        # Test 3.1: Quiz performance chart
        self.run_test(
            "Quiz Performance Chart",
            "POST",
            "/analytics/lecturer/chart/",
            lecturer_headers,
            {
                "chart_type": "quiz",
                "target_id": self.test_data['ai_quiz_id']
            }
        )
        
        # Test 3.2: Topic performance chart
        self.run_test(
            "Topic Performance Chart",
            "POST", 
            "/analytics/lecturer/chart/",
            lecturer_headers,
            {
                "chart_type": "topic",
                "target_id": self.test_data['topic_id']
            }
        )
        
        # Test 3.3: Course performance chart
        self.run_test(
            "Course Performance Chart",
            "POST",
            "/analytics/lecturer/chart/",
            lecturer_headers,
            {
                "chart_type": "course", 
                "target_id": self.test_data['course_id']
            }
        )
        
        # Test 3.4: Student distribution chart
        self.run_test(
            "Student Distribution Chart",
            "POST",
            "/analytics/lecturer/chart/",
            lecturer_headers,
            {
                "chart_type": "student_distribution"
            }
        )

    def test_suite_4_trends_and_comparisons(self):
        """Test trend analysis and comparison endpoints"""
        print("\n" + "="*50)
        print("TEST SUITE 4: Trends and Comparisons")
        print("="*50)
        
        lecturer_headers = {**HEADERS, "Authorization": f"Token {self.test_data['lecturer_token']}"}
        
        # Test 4.1: Engagement trends
        self.run_test(
            "Engagement Trends",
            "GET",
            f"/analytics/trends/engagement/?period=30&course_id={self.test_data['course_id']}",
            lecturer_headers
        )
        
        # Test 4.2: Performance trends
        self.run_test(
            "Performance Trends",
            "GET",
            f"/analytics/trends/performance/?period=30&course_id={self.test_data['course_id']}",
            lecturer_headers
        )
        
        # Test 4.3: Compare AI quizzes
        self.run_test(
            "Compare AI Quizzes",
            "POST",
            "/analytics/compare/quizzes/",
            lecturer_headers,
            {
                "quiz_ids": [self.test_data['ai_quiz_id']]
            }
        )
        
        # Test 4.4: Compare topics
        self.run_test(
            "Compare Topics",
            "POST",
            "/analytics/compare/topics/",
            lecturer_headers,
            {
                "topic_ids": [self.test_data['topic_id']]
            }
        )
        
        # Test 4.5: Compare courses
        self.run_test(
            "Compare Courses",
            "POST",
            "/analytics/compare/courses/",
            lecturer_headers,
            {
                "course_ids": [self.test_data['course_id']]
            }
        )

    def test_suite_5_export_functionality(self):
        """Test data export endpoints"""
        print("\n" + "="*50)
        print("TEST SUITE 5: Export Functionality")
        print("="*50)
        
        lecturer_headers = {**HEADERS, "Authorization": f"Token {self.test_data['lecturer_token']}"}
        
        # Test 5.1: Export analytics data (JSON)
        self.run_test(
            "Export Analytics Data (JSON)",
            "GET",
            "/analytics/export/?type=course&format=json",
            lecturer_headers
        )
        
        # Test 5.2: Export analytics data (CSV)
        self.run_test(
            "Export Analytics Data (CSV)",
            "GET",
            "/analytics/export/?type=student&format=csv",
            lecturer_headers
        )
        
        # Test 5.3: Export AI quiz results
        self.run_test(
            "Export AI Quiz Results",
            "GET",
            f"/analytics/quiz/{self.test_data['ai_quiz_id']}/export/?format=json",
            lecturer_headers
        )
        
        # Test 5.4: Export course data
        self.run_test(
            "Export Course Data",
            "GET",
            f"/analytics/course/{self.test_data['course_id']}/export/?format=json",
            lecturer_headers
        )

    def test_suite_6_live_statistics(self):
        """Test real-time statistics endpoints"""
        print("\n" + "="*50)
        print("TEST SUITE 6: Live Statistics")
        print("="*50)
        
        lecturer_headers = {**HEADERS, "Authorization": f"Token {self.test_data['lecturer_token']}"}
        
        # Test 6.1: Live AI quiz stats
        self.run_test(
            "Live AI Quiz Stats",
            "GET",
            f"/analytics/quiz/{self.test_data['ai_quiz_id']}/live-stats/",
            lecturer_headers
        )

    def test_suite_7_error_cases(self):
        """Test error handling and edge cases"""
        print("\n" + "="*50)
        print("TEST SUITE 7: Error Handling")
        print("="*50)
        
        lecturer_headers = {**HEADERS, "Authorization": f"Token {self.test_data['lecturer_token']}"}
        student_headers = {**HEADERS, "Authorization": f"Token {self.test_data['student_token']}"}
        
        # Test 7.1: Non-existent AI quiz
        self.run_test(
            "Non-existent AI Quiz",
            "GET",
            "/analytics/quiz/99999/stats/",
            lecturer_headers,
            expected_status=404
        )
        
        # Test 7.2: Student trying to access lecturer endpoint
        self.run_test(
            "Student Access to Lecturer Endpoint",
            "GET",
            "/analytics/lecturer/dashboard/",
            student_headers,
            expected_status=403
        )
        
        # Test 7.3: Invalid chart type
        self.run_test(
            "Invalid Chart Type",
            "POST",
            "/analytics/lecturer/chart/",
            lecturer_headers,
            {
                "chart_type": "invalid_type"
            },
            expected_status=400
        )
        
        # Test 7.4: Missing required parameters
        self.run_test(
            "Missing Chart Target ID",
            "POST",
            "/analytics/lecturer/chart/",
            lecturer_headers,
            {
                "chart_type": "quiz"
                # Missing target_id
            },
            expected_status=400
        )

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Analytics API Tests")
        print("Make sure you have:")
        print("- AI quiz attempts in your database")
        print("- Enrolled students with completed adaptive quizzes") 
        print("- Valid authentication tokens")
        print("\n")
        
        self.test_suite_1_basic_endpoints()
        self.test_suite_2_detailed_analytics()
        self.test_suite_3_chart_analytics()
        self.test_suite_4_trends_and_comparisons()
        self.test_suite_5_export_functionality()
        self.test_suite_6_live_statistics()
        self.test_suite_7_error_cases()
        
        self.print_summary()

    def print_summary(self):
        """Print test results summary"""
        print("\n" + "="*50)
        print("TEST RESULTS SUMMARY")
        print("="*50)
        
        total_tests = len(self.results)
        passed_tests = len([r for r in self.results if r['success']])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\nFailed Tests:")
            for result in self.results:
                if not result['success']:
                    print(f"❌ {result['test']} (Status: {result['status']})")
                    if 'error' in result:
                        print(f"   Error: {result['error']}")


# Usage Example:
if __name__ == "__main__":
    # Update these with your actual values
    test_data = {
        "lecturer_token": "your_lecturer_token_here",
        "student_token": "your_student_token_here",
        "course_id": 1,
        "topic_id": 1, 
        "ai_quiz_id": 1,
        "student_id": 1
    }
    
    # Initialize and run tests
    test_runner = AnalyticsTestRunner(BASE_URL, test_data)
    test_runner.run_all_tests()


# Manual Test Cases (Run in Django shell or via API client)

"""
MANUAL TEST CASE 1: Data Verification
=====================================
# Check if AI quiz attempts exist
from ai_quiz.models import AdaptiveQuizAttempt
print(f"AI Quiz Attempts: {AdaptiveQuizAttempt.objects.count()}")

# Check student metrics  
from analytics.models import StudentEngagementMetrics
print(f"Student Metrics: {StudentEngagementMetrics.objects.count()}")

# Check relationship paths work
attempts = AdaptiveQuizAttempt.objects.filter(
    progress__adaptive_quiz__lecture_slide__topic__course__id=1
)
print(f"Course 1 AI quiz attempts: {attempts.count()}")


MANUAL TEST CASE 2: API Response Structure
==========================================
# Test student dashboard response structure
GET /analytics/student/dashboard/

Expected Response:
{
    "overall_average": 85.5,
    "total_quizzes_taken": 12,
    "performance_trend": [
        {
            "quiz_title": "Introduction to Data Structures",
            "difficulty": "easy",
            "score": 90.0,
            "date": "2025-01-15",
            "course_code": "CS101"
        }
    ],
    "course_averages": {
        "CS101": {
            "average": 87.3,
            "total_quizzes": 5,
            "course_name": "Computer Science 101"
        }
    }
}


MANUAL TEST CASE 3: Permission Testing
=====================================
# Test lecturer accessing other lecturer's data
GET /analytics/course/{other_lecturer_course_id}/stats/
Expected: 403 Forbidden or 404 Not Found

# Test student accessing lecturer endpoints
GET /analytics/lecturer/dashboard/
Expected: 403 Forbidden


MANUAL TEST CASE 4: Edge Cases
==============================
# Test course with no AI quiz attempts
GET /analytics/course/{empty_course_id}/stats/
Expected: Zero counts, empty arrays

# Test student with no quiz attempts  
GET /analytics/student/dashboard/
Expected: All zeros, empty arrays

# Test invalid date parameters
GET /analytics/student/engagement-heatmap/?year=2030&month=15
Expected: Graceful handling or validation error
"""