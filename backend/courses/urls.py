from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'courses', views.CourseViewSet)
router.register(r'topics', views.TopicViewSet, basename='topic')

urlpatterns = [
    path('', include(router.urls)),
    
    # Student endpoints
    path('student/dashboard/', views.student_dashboard, name='student_dashboard'),
    path('my-courses/', views.my_courses, name='my_courses'),
    
    # Course management endpoints
    path('course/<int:course_id>/upload-students/', views.upload_students_csv, name='upload-students-csv'),
    path('course/<int:course_id>/attendance/', views.course_attendance, name='course-attendance'),
    path('course/<int:course_id>/mark-attendance/', views.mark_attendance, name='mark-attendance'),
]