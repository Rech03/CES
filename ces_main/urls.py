from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

# Import views for home/api root
def home_redirect(request):
    """Redirect home page to API root"""
    from django.http import JsonResponse
    return JsonResponse({
        'message': 'Welcome to Course Engagement System API',
        'api_root': '/api/',
        'admin_panel': '/admin/',
    })

def api_root(request):
    """API Root endpoint"""
    from django.http import JsonResponse
    return JsonResponse({
        'message': 'Course Engagement System API',
        'version': '1.0',
        'endpoints': {
            'authentication': {
                'login': '/api/auth/login/',
                'logout': '/api/auth/logout/',
                'profile': '/api/auth/profile/',
                'dashboard': '/api/auth/dashboard/',
                'change_password': '/api/auth/change-password/',
            },
            'courses': '/api/courses/',
            'quizzes': '/api/quizzes/',
            'analytics': '/api/analytics/',
            'admin': '/admin/',
        },
    })

urlpatterns = [
    # Home and API root
    path('', home_redirect, name='home'),
    path('api/', api_root, name='api_root'),
    
    # Admin
    path('admin/', admin.site.urls),
    
    # API endpoints
    path('api/auth/', include('users.urls')),
    path('api/courses/', include('courses.urls')),
    #path('api/quizzes/', include('quizzes.urls')),
    #path('api/analytics/', include('analytics.urls')),
    
    # Django REST framework browsable API (for development)
    path('api-auth/', include('rest_framework.urls')),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# Admin site customization
admin.site.site_header = "Course Engagement System"
admin.site.site_title = "CES Admin"
admin.site.index_title = "CES Administration"

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# Admin site customization
admin.site.site_header = "Course Engagement System"
admin.site.site_title = "CES Admin"
admin.site.index_title = "CES Administration"