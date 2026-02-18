# Final APK Deployment with S3 Upload Fix

## Why
The mobile APK still uses the old upload method that fails with local storage. Need to rebuild APK with S3 upload flow to fix "Upload failed" errors on physical device.

## What Changes
- **BREAKING**: Replace old `uploadFile()` calls with `uploadFileToS3()` in mobile app
- Update upload error messages to show more details
- Rebuild APK with new S3 upload implementation
- Deploy to physical device for testing

## Impact
- Affected specs: Mobile app upload functionality
- Affected code: `lib/main.dart` upload functions, `lib/api.dart` imports

## ADDED Requirements
### Requirement: S3 Upload Implementation
The system SHALL use S3 presigned URLs for file uploads instead of direct multipart uploads.

#### Scenario: Music Upload
- **WHEN** user selects audio file for upload
- **THEN** app generates S3 presigned URL and uploads directly to S3
- **AND** completes upload in backend database

#### Scenario: Announcement Upload  
- **WHEN** user records or selects announcement audio
- **THEN** app uses S3 upload flow for reliable cloud storage

## MODIFIED Requirements
### Requirement: Upload Error Handling
**Previous**: Generic "Upload failed" message
**Updated**: Show specific error details to help debugging

### Requirement: Upload Success Messages
**Previous**: "Uploaded successfully"
**Updated**: "Uploaded successfully to S3" to indicate cloud storage