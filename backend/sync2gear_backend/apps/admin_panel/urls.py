"""
URL routing for admin panel app.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'admin_panel'

router = DefaultRouter()
router.register(r'clients', views.ClientViewSet, basename='client')
router.register(r'users', views.UserManagementViewSet, basename='user')
router.register(r'audit-logs', views.AuditLogViewSet, basename='auditlog')
router.register(r'ai-providers', views.AIProviderViewSet, basename='aiprovider')

urlpatterns = [
    path('', include(router.urls)),
    path('stats/', views.SystemStatsView.as_view({'get': 'overview'}), name='stats'),
    path('stats/audit-logs/', views.SystemStatsView.as_view({'get': 'audit_logs'}), name='stats-audit-logs'),
]
