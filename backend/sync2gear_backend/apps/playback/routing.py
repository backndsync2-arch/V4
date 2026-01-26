"""
WebSocket routing for playback app.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/playback/(?P<zone_id>[0-9a-f-]+)/$', consumers.PlaybackConsumer.as_asgi()),
    re_path(r'ws/events/$', consumers.EventsConsumer.as_asgi()),
]
