from django.shortcuts import render
from django.views.generic import TemplateView

class APIDocumentationView(TemplateView):
    template_name = 'api_doc.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # Define your ACTUAL API endpoints structure based on your real code
        context['api_structure'] = {
            'Users Management': {
                'description': 'Authentication, user profiles, and role management (students, lecturers, admins)',
                'endpoints': [
                    {'method': 'POST', 'url': '/api/users/login/', 'description': 'User login with username/email and password'},
                    {'method': 'POST', 'url': '/api/users/logout/', 'description': 'User logout and token cleanup'},
                    {'method': 'GET', 'url': '/api/users/profile/', 'description': 'Get current user profile data'},
                    {'method': 'PUT', 'url': '/api/users/profile/', 'description': 'Update user profile information'},
                    {'method': 'POST', 'url': '/api/users/change-password/', 'description': 'Change user password'},
                    {'method': 'GET', 'url': '/api/users/dashboard/', 'description': 'Get user dashboard data by type (student/lecturer/admin)'},
                    {'method': 'GET', 'url': '/api/users/check-enrollment/', 'description': 'Check if student is enrolled in courses'},
                ]
            },
            'Courses Management': {
                'description': 'Course creation, enrollment, topics, and attendance management',
                'endpoints': [
                    # Course ViewSet endpoints
                    {'method': 'GET', 'url': '/api/courses/courses/', 'description': 'List courses for current user'},
                    {'method': 'POST', 'url': '/api/courses/courses/', 'description': 'Create new course (lecturers only)'},
                    {'method': 'GET', 'url': '/api/courses/courses/{id}/', 'description': 'Get specific course details'},
                    {'method': 'PUT', 'url': '/api/courses/courses/{id}/', 'description': 'Update course information'},
                    {'method': 'DELETE', 'url': '/api/courses/courses/{id}/', 'description': 'Delete course'},
                    {'method': 'GET', 'url': '/api/courses/courses/{id}/students/', 'description': 'Get enrolled students (lecturers only)'},
                    {'method': 'GET', 'url': '/api/courses/courses/{id}/dashboard/', 'description': 'Get course dashboard data'},
                    {'method': 'POST', 'url': '/api/courses/courses/{id}/remove_student/', 'description': 'Remove student from course'},
                    {'method': 'GET', 'url': '/api/courses/courses/{id}/topics/', 'description': 'Get course topics'},
                    # Topic ViewSet endpoints
                    {'method': 'GET', 'url': '/api/courses/topics/', 'description': 'List topics for user courses'},
                    {'method': 'POST', 'url': '/api/courses/topics/', 'description': 'Create new topic (lecturers only)'},
                    {'method': 'GET', 'url': '/api/courses/topics/{id}/', 'description': 'Get topic details'},
                    {'method': 'PUT', 'url': '/api/courses/topics/{id}/', 'description': 'Update topic'},
                    {'method': 'DELETE', 'url': '/api/courses/topics/{id}/', 'description': 'Delete topic'},
                    # Additional endpoints
                    {'method': 'GET', 'url': '/api/courses/student/dashboard/', 'description': 'Student dashboard with course data'},
                    {'method': 'GET', 'url': '/api/courses/my-courses/', 'description': 'Get user\'s courses'},
                    {'method': 'POST', 'url': '/api/courses/course/{id}/upload-students/', 'description': 'Upload CSV to create and enroll students'},
                    {'method': 'GET', 'url': '/api/courses/course/{id}/attendance/', 'description': 'Get attendance records for course'},
                    {'method': 'POST', 'url': '/api/courses/course/{id}/mark-attendance/', 'description': 'Mark student attendance'},
                ]
            },
            'Quiz System': {
                'description': 'Traditional quiz creation, management, live quizzes, and submission',
                'endpoints': [
                    # Quiz ViewSet endpoints
                    {'method': 'GET', 'url': '/api/quizzes/quizzes/', 'description': 'List quizzes for current user'},
                    {'method': 'POST', 'url': '/api/quizzes/quizzes/', 'description': 'Create new quiz (lecturers only)'},
                    {'method': 'GET', 'url': '/api/quizzes/quizzes/{id}/', 'description': 'Get quiz details'},
                    {'method': 'PUT', 'url': '/api/quizzes/quizzes/{id}/', 'description': 'Update quiz'},
                    {'method': 'DELETE', 'url': '/api/quizzes/quizzes/{id}/', 'description': 'Delete quiz'},
                    {'method': 'POST', 'url': '/api/quizzes/quizzes/{id}/start_live/', 'description': 'Start live quiz session'},
                    {'method': 'POST', 'url': '/api/quizzes/quizzes/{id}/stop_live/', 'description': 'Stop live quiz session'},
                    {'method': 'GET', 'url': '/api/quizzes/quizzes/{id}/questions/', 'description': 'Get quiz questions'},
                    {'method': 'GET', 'url': '/api/quizzes/quizzes/{id}/attempts/', 'description': 'Get quiz attempts (lecturers only)'},
                    # Question/Choice ViewSets
                    {'method': 'GET', 'url': '/api/quizzes/questions/', 'description': 'List questions (lecturers only)'},
                    {'method': 'POST', 'url': '/api/quizzes/questions/', 'description': 'Create new question'},
                    {'method': 'GET', 'url': '/api/quizzes/questions/{id}/', 'description': 'Get question details'},
                    {'method': 'PUT', 'url': '/api/quizzes/questions/{id}/', 'description': 'Update question'},
                    {'method': 'DELETE', 'url': '/api/quizzes/questions/{id}/', 'description': 'Delete question'},
                    {'method': 'POST', 'url': '/api/quizzes/questions/{id}/add_choice/', 'description': 'Add choice to question'},
                    {'method': 'GET', 'url': '/api/quizzes/choices/', 'description': 'List choices (lecturers only)'},
                    {'method': 'POST', 'url': '/api/quizzes/choices/', 'description': 'Create new choice'},
                    {'method': 'GET', 'url': '/api/quizzes/choices/{id}/', 'description': 'Get choice details'},
                    {'method': 'PUT', 'url': '/api/quizzes/choices/{id}/', 'description': 'Update choice'},
                    {'method': 'DELETE', 'url': '/api/quizzes/choices/{id}/', 'description': 'Delete choice'},
                    # Quiz attempt endpoints
                    {'method': 'POST', 'url': '/api/quizzes/quiz/start/', 'description': 'Start quiz attempt (students only)'},
                    {'method': 'POST', 'url': '/api/quizzes/quiz/submit-answer/', 'description': 'Submit answer for quiz question'},
                    {'method': 'POST', 'url': '/api/quizzes/quiz/submit/', 'description': 'Submit and finalize quiz attempt'},
                    {'method': 'GET', 'url': '/api/quizzes/quiz/attempt/{id}/', 'description': 'Get detailed quiz attempt results'},
                    # Student endpoints
                    {'method': 'GET', 'url': '/api/quizzes/student/available-quizzes/', 'description': 'Get available quizzes for student'},
                    {'method': 'GET', 'url': '/api/quizzes/student/my-attempts/', 'description': 'Get student\'s quiz attempts'},
                    # Statistics
                    {'method': 'GET', 'url': '/api/quizzes/quiz/{id}/statistics/', 'description': 'Get detailed quiz statistics (lecturers only)'},
                ]
            },
            'AI-Powered Adaptive Quizzes': {
                'description': 'Claude AI-generated adaptive learning quizzes from lecture slides',
                'endpoints': [
                    # Lecturer endpoints
                    {'method': 'POST', 'url': '/api/ai-quiz/lecturer/upload-slide/', 'description': 'Upload PDF lecture slides'},
                    {'method': 'POST', 'url': '/api/ai-quiz/lecturer/generate-questions/', 'description': 'Generate AI questions from slides using Claude API'},
                    {'method': 'GET', 'url': '/api/ai-quiz/lecturer/slides/', 'description': 'List uploaded lecture slides'},
                    {'method': 'DELETE', 'url': '/api/ai-quiz/lecturer/slide/{id}/delete/', 'description': 'Delete lecture slide and quizzes'},
                    {'method': 'POST', 'url': '/api/ai-quiz/lecturer/slide/{id}/regenerate/', 'description': 'Regenerate AI questions for slide'},
                    # Student endpoints  
                    {'method': 'GET', 'url': '/api/ai-quiz/student/available-slides/', 'description': 'Get available slides with quiz access info'},
                    {'method': 'GET', 'url': '/api/ai-quiz/student/quiz/{id}/', 'description': 'Get adaptive quiz questions (progressive difficulty)'},
                    {'method': 'POST', 'url': '/api/ai-quiz/student/submit-quiz/', 'description': 'Submit adaptive quiz attempt'},
                    {'method': 'GET', 'url': '/api/ai-quiz/student/progress/', 'description': 'Get student adaptive learning progress'},
                    # Analytics
                    {'method': 'GET', 'url': '/api/ai-quiz/slide/{id}/stats/', 'description': 'Get slide statistics by difficulty'},
                    {'method': 'GET', 'url': '/api/ai-quiz/progress-analytics/', 'description': 'Get progress analytics for students/lecturers'},
                ]
            },
            'Analytics & Engagement': {
                'description': 'Student engagement tracking, performance analytics, and comprehensive reporting',
                'endpoints': [
                    # System management
                    {'method': 'POST', 'url': '/api/analytics/update-metrics/', 'description': 'Update student engagement metrics'},
                    # Lecturer analytics
                    {'method': 'GET', 'url': '/api/analytics/lecturer/dashboard/', 'description': 'Main lecturer analytics dashboard'},
                    {'method': 'POST', 'url': '/api/analytics/lecturer/chart/', 'description': 'Generate specific analytics charts'},
                    {'method': 'GET', 'url': '/api/analytics/lecturer/course-options/', 'description': 'Get course options for analytics dropdowns'},
                    # Student analytics
                    {'method': 'GET', 'url': '/api/analytics/student/dashboard/', 'description': 'Student personal analytics dashboard'},
                    {'method': 'GET', 'url': '/api/analytics/student/engagement-heatmap/', 'description': 'Student engagement calendar heatmap'},
                    # Detailed statistics
                    {'method': 'GET', 'url': '/api/analytics/quiz/{id}/stats/', 'description': 'Detailed quiz statistics and question analysis'},
                    {'method': 'GET', 'url': '/api/analytics/topic/{id}/stats/', 'description': 'Topic-level analytics and performance'},
                    {'method': 'GET', 'url': '/api/analytics/course/{id}/stats/', 'description': 'Course-wide statistics and engagement'},
                    {'method': 'GET', 'url': '/api/analytics/student/{id}/engagement/', 'description': 'Individual student engagement details'},
                    # Data export
                    {'method': 'GET', 'url': '/api/analytics/export/', 'description': 'Export analytics data (CSV/JSON)'},
                    {'method': 'GET', 'url': '/api/analytics/quiz/{id}/export/', 'description': 'Export quiz results'},
                    {'method': 'GET', 'url': '/api/analytics/course/{id}/export/', 'description': 'Export course data'},
                    # Real-time analytics
                    {'method': 'GET', 'url': '/api/analytics/quiz/{id}/live-stats/', 'description': 'Real-time quiz statistics'},
                    {'method': 'GET', 'url': '/api/analytics/trends/engagement/', 'description': 'Engagement trends over time'},
                    {'method': 'GET', 'url': '/api/analytics/trends/performance/', 'description': 'Performance trends analysis'},
                    # Comparative analytics
                    {'method': 'POST', 'url': '/api/analytics/compare/quizzes/', 'description': 'Compare multiple quizzes'},
                    {'method': 'POST', 'url': '/api/analytics/compare/topics/', 'description': 'Compare multiple topics'},
                    {'method': 'POST', 'url': '/api/analytics/compare/courses/', 'description': 'Compare multiple courses'},
                ]
            }
        }
        
        return context