from django.urls import path
from . import views

urlpatterns = [
    # Lecturer endpoints
    path('lecturer/courses/', views.lecturer_courses, name='lecturer_courses'),
    path('lecturer/create-session/', views.create_live_session, name='create_live_session'),
    path('lecturer/sessions/', views.lecturer_sessions, name='lecturer_sessions'),
    path('lecturer/session/<int:session_id>/messages/', views.session_messages, name='session_messages'),
    path('lecturer/session/<int:session_id>/end/', views.end_session, name='end_session'),
    
    # Student endpoints
    path('join/', views.join_session, name='join_session'),
    path('<str:session_code>/send-message/', views.send_message, name='send_message'),
    path('<str:session_code>/messages/', views.get_session_messages, name='get_session_messages'),
    
    # Validation endpoints
    path('validate-code/', views.validate_session_code, name='validate_session_code'),
]