# Backend Fix for Music Streaming 404 Error

## Problem
Music files were returning 404 "Not found" errors when trying to stream from:
`/api/v1/music/files/stream/:s3Key/`

## Root Cause
1. The endpoint required strict authentication (`authenticate` middleware)
2. File lookup was too strict - only exact S3 key match
3. Audio elements couldn't access files without proper auth headers

## Fixes Applied

### 1. Changed Authentication to Optional
```javascript
// Before: router.get('/files/stream/:s3Key/', authenticate, ...)
// After:  router.get('/files/stream/:s3Key/', optionalAuthenticate, ...)
```

### 2. Improved File Lookup
Now tries multiple methods to find the file:
- Exact S3 key match
- Partial/regex match on S3 key
- Filename match (using basename from S3 key)

### 3. Made Permissions Optional
Allows access without auth token (for audio elements), but still checks permissions if token is provided.

## Deployment
Run: `npm run deploy` in the `new-backend` directory

## Testing
After deployment, test:
1. Web app - music should play again
2. Mobile app - music should play with proper auth headers

## Files Changed
- `V4/new-backend/src/routes/music.js` - Updated streaming endpoint

