# Comprehensive Audit Logging Implementation

## Overview

This document describes the comprehensive audit logging system implemented across the entire sync2gear application, following industry best practices for security and compliance.

## What Gets Logged

### 1. Authentication & Security
- ✅ **User Registration** - New account creation with email, name, role
- ✅ **Login** - Successful and failed login attempts with IP address
- ✅ **Logout** - User logout events
- ✅ **Password Changes** - Password modification events
- ✅ **Password Reset Requests** - Password reset initiation (including failed attempts)
- ✅ **Password Reset Confirmations** - Successful password resets
- ✅ **Settings Updates** - User preference changes

### 2. Music Library Operations
- ✅ **File Uploads** - Single and batch music file uploads with metadata
- ✅ **File Deletions** - Music file removal
- ✅ **Cover Art Uploads** - Album art uploads
- ✅ **Folder Creation** - New folder creation with type and zone
- ✅ **Folder Updates** - Folder modifications
- ✅ **Folder Deletions** - Folder removal
- ✅ **Track Reordering** - Playlist order changes

### 3. Announcements
- ✅ **Instant Play** - Immediate announcement playback on zones/devices
- ✅ **TTS Generation** - Text-to-speech generation (via middleware)
- ✅ **Announcement Creation/Updates/Deletions** - All CRUD operations

### 4. Playback Controls
- ✅ **Play** - Starting playback with playlists or music files
- ✅ **Pause** - Pausing playback (via middleware)
- ✅ **Resume** - Resuming playback (via middleware)
- ✅ **Volume Changes** - Volume adjustments on zones
- ✅ **Seek** - Seeking to position in track (via middleware)
- ✅ **Next/Previous** - Track navigation (via middleware)

### 5. Device & Zone Management
- ✅ **Device Registration** - New device registration
- ✅ **Device Heartbeats** - Device status updates (via middleware)
- ✅ **Device Controls** - Test tones, volume, schedule sends (via middleware)
- ✅ **Zone Creation/Updates/Deletions** - All zone operations (via middleware)
- ✅ **Floor Management** - Floor operations (via middleware)

### 6. Scheduling
- ✅ **Schedule Creation/Updates/Deletions** - All schedule operations (via middleware)
- ✅ **Schedule Toggles** - Enabling/disabling schedules (via middleware)
- ✅ **Playlist Changes** - Playlist modifications (via middleware)

### 7. Admin Operations
- ✅ **Client Management** - Client creation, updates, status toggles
- ✅ **User Management** - User CRUD operations
- ✅ **Client Status Toggles** - Activating/deactivating clients
- ✅ **Impersonation** - Admin impersonating clients (via middleware)

### 8. Sensitive Data Access
- ✅ **File Downloads/Streams** - Accessing music/announcement files
- ✅ **Data Exports** - Exporting system data
- ✅ **Audit Log Views** - Viewing audit logs
- ✅ **System Statistics** - Accessing system stats
- ✅ **User/Client Lists** - Viewing sensitive user/client data

## Implementation Details

### 1. Audit Logging Utility (`apps/common/utils.py`)

A centralized `log_audit_event()` function provides consistent logging across the application:

```python
log_audit_event(
    request=request,
    action='upload',
    resource_type='music_file',
    resource_id=str(music_file.id),
    details={'title': music_file.title, 'file_size': file.size},
    user=request.user,
    status_code=status.HTTP_201_CREATED
)
```

**Features:**
- Automatic IP address extraction
- User agent capture
- Client context preservation
- Error handling (doesn't fail requests)
- Flexible details dictionary

### 2. Enhanced Middleware (`apps/common/middleware.py`)

The `AuditLogMiddleware` automatically logs:
- All POST, PUT, PATCH, DELETE requests
- Sensitive GET requests (downloads, streams, exports, stats)
- Better resource type extraction from URLs
- Action type detection (create, update, delete, view, download, etc.)

**Sensitive GET Endpoints Logged:**
- `/stream/` - File streaming
- `/download/` - File downloads
- `/export/` - Data exports
- `/audit-logs/` - Viewing audit logs
- `/stats/` - System statistics
- `/users/` - User lists/details
- `/clients/` - Client lists/details

### 3. Explicit Logging in Views

Critical actions have explicit audit logging for detailed context:

**Authentication Views:**
- Login/logout with success/failure tracking
- Password operations with security context
- Registration with user details

**Music Views:**
- Uploads with file metadata (size, name, folder)
- Deletions with file information
- Cover art uploads
- Folder operations

**Announcements Views:**
- Instant play with zone/device details
- TTS generation tracking

**Playback Views:**
- Play actions with playlist/music file details
- Volume changes with zone information

**Admin Views:**
- Client status toggles with before/after states
- User management operations

## Audit Log Model

```python
class AuditLog(TimestampedModel):
    user = ForeignKey(User)  # Who performed the action
    action = CharField  # create, update, delete, login, upload, etc.
    resource_type = CharField  # music_file, announcement, user, etc.
    resource_id = UUIDField  # ID of the affected resource
    client = ForeignKey(Client)  # Client context
    details = JSONField  # Flexible additional details
    ip_address = GenericIPAddressField  # Request IP
    user_agent = CharField  # Browser/client info
    created_at = DateTimeField  # When it happened
```

## Industry Best Practices Followed

1. ✅ **Comprehensive Coverage** - All write operations and sensitive reads logged
2. ✅ **User Context** - Every log includes who performed the action
3. ✅ **IP Tracking** - IP addresses captured for security
4. ✅ **Detailed Context** - JSON details field for flexible metadata
5. ✅ **Non-Blocking** - Logging failures don't break requests
6. ✅ **Client Isolation** - Logs include client context for multi-tenant support
7. ✅ **Admin Actions Visible** - Admin actions logged with client=None for visibility
8. ✅ **Searchable** - Indexed fields for efficient querying
9. ✅ **Immutable** - Logs are append-only (no updates/deletes)

## Viewing Audit Logs

### Admin Panel
- Navigate to Admin → Audit Logs tab
- Filter by client, user, action, resource type
- Search by user name, email, action, resource type
- View all logs including admin actions (marked as "System" in Client column)

### API Endpoint
```
GET /api/v1/admin/audit-logs/
```

**Query Parameters:**
- `client` - Filter by client ID
- `user` - Filter by user ID
- `resource_type` - Filter by resource type
- `action` - Filter by action
- `date_from` - Start date
- `date_to` - End date
- `search` - Search in action, resource_type, user name/email

## Security Considerations

1. **Sensitive Data**: Passwords and API keys are never logged in details
2. **IP Privacy**: IP addresses stored for security but can be anonymized if needed
3. **Access Control**: Only admins can view all logs; clients see only their logs
4. **Retention**: Consider implementing log retention policies for compliance

## Future Enhancements

1. **Celery Tasks**: Move audit logging to async tasks for high-traffic scenarios
2. **Log Rotation**: Implement automatic log archiving
3. **Export**: Add ability to export audit logs for compliance
4. **Alerts**: Configure alerts for suspicious activities
5. **Analytics**: Add dashboard for audit log analytics
6. **Webhook Integration**: Send critical events to external systems

## Testing

To verify audit logging is working:

1. Perform various actions (login, upload, delete, etc.)
2. Check Admin → Audit Logs tab
3. Verify logs appear with correct details
4. Test filtering and search functionality
5. Verify admin actions show "System" in Client column

## Notes

- Middleware logs most operations automatically
- Explicit logging in views provides additional context
- Failed operations are still logged (with error status codes)
- All logs are timestamped and ordered by creation date (newest first)

