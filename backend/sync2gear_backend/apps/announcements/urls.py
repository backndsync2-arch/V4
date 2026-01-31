"""
URL routing for announcements app.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from . import views

app_name = 'announcements'

router = DefaultRouter()
router.register(r'', views.AnnouncementViewSet, basename='announcement')
router.register(r'templates/folders', views.AnnouncementTemplateFolderViewSet, basename='template-folder')

# Custom view classes that call the viewset action methods
class GenerateAITextView(APIView):
    """View for generate-ai-text endpoint."""
    permission_classes = views.AnnouncementViewSet.permission_classes
    
    def post(self, request):
        viewset = views.AnnouncementViewSet()
        viewset.request = request
        viewset.format_kwarg = None
        viewset.action = 'generate_ai_text'
        viewset.kwargs = {}
        return viewset.generate_ai_text(request)

class BatchTTSView(APIView):
    """View for batch-tts endpoint."""
    permission_classes = views.AnnouncementViewSet.permission_classes
    
    def post(self, request):
        viewset = views.AnnouncementViewSet()
        viewset.request = request
        viewset.format_kwarg = None
        viewset.action = 'batch_tts'
        viewset.kwargs = {}
        return viewset.batch_tts(request)

class PreviewVoiceView(APIView):
    """View for preview-voice endpoint."""
    permission_classes = views.AnnouncementViewSet.permission_classes
    
    def post(self, request):
        viewset = views.AnnouncementViewSet()
        viewset.request = request
        viewset.format_kwarg = None
        viewset.action = 'preview_voice'
        viewset.kwargs = {}
        return viewset.preview_voice(request)

class TTSVoicesView(APIView):
    """View for tts-voices endpoint."""
    permission_classes = views.AnnouncementViewSet.permission_classes
    
    def get(self, request):
        viewset = views.AnnouncementViewSet()
        viewset.request = request
        viewset.format_kwarg = None
        viewset.action = 'tts_voices'
        viewset.kwargs = {}
        return viewset.tts_voices(request)

class GenerateTemplatesView(APIView):
    """View for generate-templates endpoint."""
    permission_classes = views.AnnouncementViewSet.permission_classes
    
    def post(self, request):
        viewset = views.AnnouncementViewSet()
        viewset.request = request
        viewset.format_kwarg = None
        viewset.action = 'generate_templates'
        viewset.kwargs = {}
        return viewset.generate_templates(request)

class UploadAnnouncementView(APIView):
    """View for upload endpoint."""
    permission_classes = views.AnnouncementViewSet.permission_classes
    
    def post(self, request):
        viewset = views.AnnouncementViewSet()
        viewset.request = request
        viewset.format_kwarg = None
        viewset.action = 'upload'
        viewset.kwargs = {}
        return viewset.upload(request)

urlpatterns = [
    # Custom paths with hyphens (matching frontend expectations) - must come BEFORE router.urls
    path('generate-ai-text/', GenerateAITextView.as_view(), name='generate_ai_text'),
    path('generate-templates/', GenerateTemplatesView.as_view(), name='generate_templates'),
    path('batch-tts/', BatchTTSView.as_view(), name='batch_tts'),
    path('preview-voice/', PreviewVoiceView.as_view(), name='preview_voice'),
    path('tts-voices/', TTSVoicesView.as_view(), name='tts_voices'),
    path('upload/', UploadAnnouncementView.as_view(), name='upload'),
    # Router URLs (includes automatic action URLs with underscores)
    path('', include(router.urls)),
]
