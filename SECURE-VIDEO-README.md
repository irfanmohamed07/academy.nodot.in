# Secure Video Playback Implementation

This document explains the secure video playback system implemented for the e-learning platform. The system prevents videos from being downloaded, shared, or accessed outside of the authorized course pages.

## Security Features

1. **Blob URL Technology**: Videos are never directly exposed as URLs in the page source
   - Videos are loaded as binary data through secure API endpoints
   - Converted to temporary blob URLs that only work in the current browser tab
   - Blob URLs expire automatically when the tab is closed

2. **Multiple Security Layers**:
   - Server-side authentication checks
   - Referrer validation to prevent direct URL access
   - Domain restriction
   - Short-lived URLs (15-minute expiration)
   - Session-based validation
   - Secured IDs instead of direct video URLs
   - Video access logging for security monitoring

3. **Anti-Piracy Measures**:
   - Video watermarking with domain name
   - Browser tab visibility detection (pauses video when tab is not visible)
   - DevTools detection to prevent inspection
   - Disabled right-click on video elements
   - Disabled picture-in-picture mode
   - Blocked keyboard shortcuts for saving media

## How It Works

### 1. Server-Side Security

- Videos are stored in Cloudinary with private access controls
- When a user visits a course page, only security IDs are sent to the browser, not actual video URLs
- Each video has a unique security ID based on:
  - The module ID
  - The user's email
  - A server-side security key
  - A SHA-256 hash of this combination

### 2. Video Loading Process

When a user clicks to play a video:

1. The frontend requests the secure video URL from `/api/secure-video/:securityId`
2. The server verifies:
   - User authentication
   - Course purchase verification
   - Security ID validation
3. If validated, the server generates a temporary signed URL with:
   - 15-minute expiration
   - Domain restriction
   - Watermarking
4. The frontend fetches the video as binary data using `fetch()`
5. Converts the binary data to a blob using `URL.createObjectURL()`
6. Sets the blob URL as the video source
7. The video plays while being completely isolated from inspection

### 3. Additional Protections

- Video element has `controlsList="nodownload noremoteplayback"` attributes
- `disablePictureInPicture` and `disableRemotePlayback` attributes
- Event listeners block right-click and keyboard shortcuts
- Tab visibility API pauses videos when the tab is inactive
- DevTools detection can pause playback if inspection is attempted

## Setup Instructions

1. Run the setup script to create necessary database tables:
   ```
   npm run setup-video-security
   ```

2. Add required environment variables to `.env`:
   ```
   VIDEO_SECURITY_KEY=your_random_32_character_string
   VIDEO_MAX_AGE_SECONDS=900
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

3. Add videos to your Cloudinary account and update the `video_url` field in your modules table.

## Troubleshooting

- **Video not playing**: Check browser console for errors and server logs
- **Access denied errors**: Verify user authentication and course purchase status
- **Expired links**: Check that server and client times are synchronized
- **CORS issues**: Add your domain to the `allowedDomains` array in `videoRoute.js`

## Security Considerations

This implementation provides strong security against casual copying but is not 100% foolproof against determined attackers with technical knowledge. Screen recording is still technically possible but made difficult by the watermarking and tab visibility detection.

For maximum security, consider:
- DRM solutions for premium content
- Periodic updates to the security implementation
- Monitoring the video access logs for suspicious patterns 