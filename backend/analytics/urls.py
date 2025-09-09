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
    
    # Adaptive learning endpoints
    path('adaptive/', include('analytics.adaptive_urls')),
]