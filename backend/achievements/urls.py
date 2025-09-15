from django.urls import path
from . import views

urlpatterns = [
    # Student Achievement Dashboard
    path('dashboard/', views.student_achievement_dashboard, name='student_achievement_dashboard'),
    
    # Badge Management
    path('badges/', views.badge_collection, name='badge_collection'),
    path('badges/available/', views.available_badges, name='available_badges'),
    
    # Achievement History and Stats
    path('history/', views.achievement_history, name='achievement_history'),
    path('stats/', views.achievement_stats, name='achievement_stats'),
    
    # Achievement Processing
    path('check/', views.check_achievements, name='check_achievements'),
    
    # Leaderboards
    path('leaderboard/', views.leaderboard, name='achievement_leaderboard'),
]