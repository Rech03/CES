"""
URL configuration for ces_main project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import RedirectView
from .docs_view import APIDocumentationView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Root redirects to docs
    path('', RedirectView.as_view(url='/docs/', permanent=False)),
    
    # API Documentation (your custom HTML page)
    path('docs/', APIDocumentationView.as_view(), name='api_docs'),
    
    # Your API endpoints
    path('api/auth/', include('users.urls')),
    path('api/courses/', include('courses.urls')),
    path('api/analytics/', include('analytics.urls')),
    path('api/ai-quiz/', include('ai_quiz.urls')),
    path('api/achievements/', include('achievements.urls')),
    path('api/live_qna/', include('live_qna.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)