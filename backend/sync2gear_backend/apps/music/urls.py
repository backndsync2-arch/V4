"""
URL routing for music app.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'music'

router = DefaultRouter()
router.register(r'folders', views.FolderViewSet, basename='folder')
router.register(r'files', views.MusicFileViewSet, basename='musicfile')

urlpatterns = [
    path('', include(router.urls)),
    path('search/', views.MusicFileViewSet.as_view({'get': 'list'}), name='search'),
]
