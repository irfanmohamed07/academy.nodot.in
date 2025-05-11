/**
 * Video Protection Service Worker
 * This service worker intercepts video requests and enforces access controls.
 */

// List of allowed domains that can access videos
const ALLOWED_DOMAINS = ['academy.nodot.in', 'localhost', '127.0.0.1'];

// Installation
self.addEventListener('install', event => {
  console.log('Video Protection Service Worker installed');
  self.skipWaiting();
});

// Activation
self.addEventListener('activate', event => {
  console.log('Video Protection Service Worker activated');
  return self.clients.claim();
});

// Fetch event handler - intercepts all network requests
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Only intercept video file requests
  if (isVideoRequest(request)) {
    console.log('Intercepting video request:', url.pathname);
    
    // Check referrer - enforce same origin for video requests
    const referrer = request.referrer ? new URL(request.referrer) : null;
    
    if (!isAllowedOrigin(referrer)) {
      console.error('Blocked video request with invalid referrer');
      return event.respondWith(createErrorResponse('Access Denied', 'Videos can only be played from authorized domains'));
    }
    
    // Check for valid security token
    if (!hasValidToken(url)) {
      console.error('Blocked video request with invalid token');
      return event.respondWith(createErrorResponse('Access Denied', 'Invalid or expired video access token'));
    }
    
    // Allow valid video requests to pass through
    // We can add extra validation or logging here
    console.log('Allowing valid video request');
  }
  
  // For all other requests, just pass through
  return;
});

/**
 * Check if the request is for a video file
 */
function isVideoRequest(request) {
  if (request.method !== 'GET') return false;
  
  const url = new URL(request.url);
  const path = url.pathname.toLowerCase();
  
  // Check if URL path ends with common video extensions
  return path.endsWith('.mp4') || 
         path.endsWith('.webm') || 
         path.endsWith('.ogg') || 
         path.endsWith('.m3u8') ||
         path.includes('cloudfront.net') && url.searchParams.has('token');
}

/**
 * Check if the referring page is from an allowed origin
 */
function isAllowedOrigin(referrerURL) {
  if (!referrerURL) return false;
  
  const referrerHost = referrerURL.hostname;
  return ALLOWED_DOMAINS.some(domain => 
    referrerHost === domain || referrerHost.endsWith('.' + domain)
  );
}

/**
 * Check if the URL has a valid security token
 */
function hasValidToken(url) {
  // Get token parameters from URL
  const token = url.searchParams.get('token');
  const expires = url.searchParams.get('expires');
  
  // Basic validation - both token and expiration must exist
  if (!token || !expires) return false;
  
  // Check if token has expired
  const expirationTime = parseInt(expires, 10);
  const currentTime = Math.floor(Date.now() / 1000);
  
  if (isNaN(expirationTime) || expirationTime < currentTime) {
    return false;
  }
  
  // For more advanced validation, we could communicate with the main page
  // to verify if the token is valid, but that would add complexity
  return true;
}

/**
 * Create an error response when access is denied
 */
function createErrorResponse(title, message) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            color: #721c24;
            background-color: #f8d7da;
            padding: 20px;
            text-align: center;
            margin: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
          }
          .error-container {
            background-color: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-width: 500px;
          }
          h1 {
            font-size: 24px;
            margin-bottom: 20px;
          }
          p {
            font-size: 16px;
            line-height: 1.5;
          }
        </style>
      </head>
      <body>
        <div class="error-container">
          <h1>${title}</h1>
          <p>${message}</p>
          <p>Please return to the course page to continue watching.</p>
        </div>
      </body>
    </html>
  `;
  
  return new Response(html, {
    status: 403,
    headers: {
      'Content-Type': 'text/html'
    }
  });
} 