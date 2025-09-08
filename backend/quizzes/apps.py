from django.apps import AppConfig


class QuizzesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'quizzes'
    verbose_name = 'Quizzes and Assessments'

    def ready(self):
        """Initialize app when Django starts"""
        # Import signals to ensure they're connected
        pass