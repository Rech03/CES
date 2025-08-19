from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create router and register viewsets
router = DefaultRouter()
router.register(r'quizzes', views.QuizViewSet)
router.register(r'questions', views.QuestionViewSet)
router.register(r'choices', views.ChoiceViewSet)

urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # Quiz attempt endpoints
    path('quiz/start/', views.start_quiz_attempt, name='start_quiz_attempt'),
    path('quiz/submit-answer/', views.submit_answer, name='submit_answer'),
    path('quiz/submit/', views.submit_quiz_attempt, name='submit_quiz_attempt'),
    path('quiz/attempt/<int:attempt_id>/', views.quiz_attempt_detail, name='quiz_attempt_detail'),
    
    # Student endpoints
    path('student/available-quizzes/', views.available_quizzes, name='available_quizzes'),
    path('student/my-attempts/', views.my_quiz_attempts, name='my_quiz_attempts'),
    
    # Statistics endpoints
    path('quiz/<int:quiz_id>/statistics/', views.quiz_statistics, name='quiz_statistics'),
]