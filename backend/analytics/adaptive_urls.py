from django.urls import path
from . import adaptive_views

urlpatterns = [
    # Lecturer endpoints - slide management
    path('lecturer/upload-slide/', adaptive_views.upload_lecture_slide, name='upload_lecture_slide'),
    path('lecturer/generate-questions/', adaptive_views.generate_adaptive_questions, name='generate_adaptive_questions'),
    path('lecturer/slides/', adaptive_views.lecturer_lecture_slides, name='lecturer_lecture_slides'),
    path('lecturer/slide/<int:slide_id>/delete/', adaptive_views.delete_lecture_slide, name='delete_lecture_slide'),
    path('lecturer/slide/<int:slide_id>/regenerate/', adaptive_views.regenerate_questions, name='regenerate_questions'),
    
    # Student endpoints - quiz taking
    path('student/available-slides/', adaptive_views.student_available_slides, name='student_available_slides'),
    path('student/quiz/<int:quiz_id>/', adaptive_views.get_adaptive_quiz, name='get_adaptive_quiz'),
    path('student/submit-quiz/', adaptive_views.submit_adaptive_quiz, name='submit_adaptive_quiz'),
    path('student/progress/', adaptive_views.student_adaptive_progress, name='student_adaptive_progress'),
]