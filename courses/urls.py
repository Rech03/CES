from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create router and register viewsets
router = DefaultRouter()
router.register(r'courses', views.CourseViewSet)
router.register(r'topics', views.TopicViewSet, basename='topic')

urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # Student endpoints
    path('student/dashboard/', views.student_dashboard, name='student_dashboard'),
    path('student/enroll/', views.enroll_with_code, name='enroll_with_code'),
    path('my-courses/', views.my_courses, name='my_courses'),
    
    # Course management endpoints
    path('course/<int:course_id>/statistics/', views.course_statistics, name='course_statistics'),
    path('course/<int:course_id>/regenerate-code/', views.regenerate_enrollment_code, name='regenerate_enrollment_code'),
]