"""
URL routing for zones app.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'zones'

router = DefaultRouter()
router.register(r'floors', views.FloorViewSet, basename='floor')
router.register(r'zones', views.ZoneViewSet, basename='zone')
router.register(r'devices', views.DeviceViewSet, basename='device')

urlpatterns = [
    path('', include(router.urls)),
]
