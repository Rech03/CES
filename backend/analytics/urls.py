from django.urls import path, include
from . import views

urlpatterns = [
    # System management
    path('update-metrics/', views.update_student_metrics, name='update_student_metrics'),
    
    # Lecturer analytics
    path('lecturer/dashboard/', views.lecturer_analytics_dashboard, name='lecturer_analytics_dashboard'),
    path('lecturer/chart/', views.lecturer_analytics_chart, name='lecturer_analytics_chart'),
    path('lecturer/course-options/', views.lecturer_course_options, name='lecturer_course_options'),
    
    # Student analytics
    path('student/dashboard/', views.student_analytics_dashboard, name='student_analytics_dashboard'),
    path('student/engagement-heatmap/', views.student_engagement_heatmap, name='student_engagement_heatmap'),
    
    # DETAILED STATISTICS ENDPOINTS
    path('quiz/<int:quiz_id>/stats/', views.quiz_statistics, name='quiz_statistics'),
    path('topic/<int:topic_id>/stats/', views.topic_statistics, name='topic_statistics'),
    path('course/<int:course_id>/stats/', views.course_statistics, name='course_statistics'),
    path('student/<int:student_id>/engagement/', views.student_engagement_detail, name='student_engagement_detail'),
    
    # DATA EXPORT ENDPOINTS
    path('export/', views.export_analytics_data, name='export_analytics_data'),
    path('quiz/<int:quiz_id>/export/', views.export_quiz_results, name='export_quiz_results'),
    path('course/<int:course_id>/export/', views.export_course_data, name='export_course_data'),
    
    # REAL-TIME ANALYTICS
    path('quiz/<int:quiz_id>/live-stats/', views.get_live_quiz_stats, name='get_live_quiz_stats'),
    path('trends/engagement/', views.get_engagement_trends, name='get_engagement_trends'),
    path('trends/performance/', views.get_performance_trends, name='get_performance_trends'),
    
    # COMPARATIVE ANALYTICS
    path('compare/quizzes/', views.compare_quizzes, name='compare_quizzes'),
    path('compare/topics/', views.compare_topics, name='compare_topics'),
    path('compare/courses/', views.compare_courses, name='compare_courses'),
    
    # ADAPTIVE LEARNING ANALYTICS
    path('adaptive/slide/<int:slide_id>/stats/', views.adaptive_slide_statistics, name='adaptive_slide_statistics'),
    path('adaptive/progress/', views.get_progress_analytics, name='get_progress_analytics'),
    
    # Adaptive learning endpoints (existing from adaptive_urls.py)
    path('adaptive/', include('analytics.adaptive_urls')),
]