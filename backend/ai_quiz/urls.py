from django.urls import path
from . import views

urlpatterns = [
    # Quiz moderation endpoints
    path('lecturer/quiz/<int:quiz_id>/moderate/', views.get_quiz_for_moderation, name='get_quiz_for_moderation'),
    path('lecturer/quiz/<int:quiz_id>/update/', views.update_quiz_questions, name='update_quiz_questions'),
    path('lecturer/quiz/<int:quiz_id>/publish/', views.publish_quiz, name='publish_quiz'),
    path('lecturer/quizzes-for-review/', views.get_quizzes_for_review, name='get_quizzes_for_review'),

    # Lecturer endpoints 
    path('lecturer/upload-slide/', views.upload_lecture_slide, name='upload_lecture_slide'),
    path('lecturer/generate-questions/', views.generate_adaptive_questions, name='generate_adaptive_questions'),
    path('lecturer/slides/', views.lecturer_lecture_slides, name='lecturer_lecture_slides'),
    path('lecturer/slide/<int:slide_id>/delete/', views.delete_lecture_slide, name='delete_lecture_slide'),
    path('lecturer/slide/<int:slide_id>/regenerate/', views.regenerate_questions, name='regenerate_questions'),
    path('lecturer/available-quizzes/', views.get_lecturer_available_quizzes, name='lecturer_available_quizzes'),
    
    # Student endpoints - quiz taking
    path('student/available-slides/', views.student_available_slides, name='student_available_slides'),
    path('student/quiz/<int:quiz_id>/', views.get_adaptive_quiz, name='get_adaptive_quiz'),
    path('student/submit-quiz/', views.submit_adaptive_quiz, name='submit_adaptive_quiz'),
    path('student/progress/', views.student_adaptive_progress, name='student_adaptive_progress'),
    path('student/available-quizzes/', views.get_student_available_quizzes, name='student_available_quizzes'),
    path('student/quiz-summary/', views.get_student_quiz_summary, name='student_quiz_summary'),
    
    # Analytics for AI Quiz
    path('slide/<int:slide_id>/stats/', views.adaptive_slide_statistics, name='adaptive_slide_statistics'),
    path('progress-analytics/', views.get_progress_analytics, name='get_progress_analytics'),
]