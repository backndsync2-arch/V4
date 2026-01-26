"""
URL routing for playback app.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'playback'

router = DefaultRouter()
router.register(r'state', views.PlaybackStateViewSet, basename='playbackstate')
router.register(r'control', views.PlaybackControlViewSet, basename='playbackcontrol')
router.register(r'events', views.PlayEventViewSet, basename='playevent')

urlpatterns = [
    path('', include(router.urls)),
]
