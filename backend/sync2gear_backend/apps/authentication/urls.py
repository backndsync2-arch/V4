"""
URL routing for authentication app.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

from django.urls import path
from . import views

app_name = 'authentication'

urlpatterns = [
    path('signup/', views.SignUpView.as_view(), name='signup'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('refresh/', views.RefreshTokenView.as_view(), name='refresh'),
    path('me/', views.CurrentUserView.as_view(), name='current-user'),
    path('me/settings/', views.UserSettingsViewSet.as_view(), name='user-settings'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change-password'),
    path('set-password/', views.SetPasswordView.as_view(), name='set-password'),
    path('password-reset/', views.password_reset_request, name='password-reset'),
    path('password-reset/confirm/', views.password_reset_confirm, name='password-reset-confirm'),
    path('seed-users/', views.seed_users, name='seed-users'),  # For initial setup
]
