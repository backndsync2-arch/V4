"""
URL routing for scheduler app.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'scheduler'

router = DefaultRouter()
router.register(r'schedules', views.ScheduleViewSet, basename='schedule')
router.register(r'playlists', views.ChannelPlaylistViewSet, basename='channelplaylist')

urlpatterns = [
    path('', include(router.urls)),
]
