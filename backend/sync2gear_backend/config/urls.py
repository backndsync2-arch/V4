"""
URL configuration for sync2gear project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from apps.common.views import HealthCheckView, APIRootView
from django.views.generic import RedirectView

# API version
API_VERSION = getattr(settings, 'API_VERSION', 'v1')
API_PREFIX = f'api/{API_VERSION}'

urlpatterns = [
    # Root - redirect to API root or show API info
    path('', APIRootView.as_view(), name='api-root'),
    
    # Admin
    path('admin/', admin.site.urls),
    
    # Health Check
    path('api/health/', HealthCheckView.as_view(), name='health-check'),
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # API Routes
    path(f'{API_PREFIX}/auth/', include('apps.authentication.urls')),
    path(f'{API_PREFIX}/music/', include('apps.music.urls')),
    path(f'{API_PREFIX}/announcements/', include('apps.announcements.urls')),
    path(f'{API_PREFIX}/schedules/', include('apps.scheduler.urls')),
    path(f'{API_PREFIX}/zones/', include('apps.zones.urls')),  # Includes floors, zones, and devices
    path(f'{API_PREFIX}/playback/', include('apps.playback.urls')),
    path(f'{API_PREFIX}/admin/', include('apps.admin_panel.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
