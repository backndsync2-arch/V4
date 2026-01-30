"""
URL routing for scheduler app.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import simple_views

app_name = 'scheduler'

router = DefaultRouter()
router.register(r'schedules', views.ScheduleViewSet, basename='schedule')
router.register(r'playlists', views.ChannelPlaylistViewSet, basename='channelplaylist')

urlpatterns = [
    # Simple scheduler endpoints - MUST come before router to avoid conflicts
    path('simple/active/', simple_views.get_active_schedules, name='simple-active'),
    path('simple/execute/', simple_views.execute_schedules, name='simple-execute'),
]

# Add router URLs after simple views
urlpatterns += router.urls
