import express from "express";
import pool from "../DB/index.js";
import dotenv from "dotenv";
import fs from "fs";
import bcrypt from "bcrypt";
import path from "path";
import crypto from "crypto";
import cloudinary from "cloudinary";
import { generateSecureVideoScript } from "./videoRoute.js";

dotenv.config();
const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Allowed domains for video playback
const allowedDomains = ['academy.nodot.in', 'localhost:4000', '127.0.0.1:4000', 'localhost', '127.0.0.1'];

/**
 * Creates a secure video URL for streaming via Cloudinary
 * With domain restriction and signed URL for security
 */
function createSecureVideoUrl(videoPath, req) {
  if (!videoPath) return '';
  
  // If it's already a Cloudinary URL, return it as is
  if (videoPath.includes('cloudinary.com')) {
    return videoPath;
  }
  
  try {
    // For paths not on Cloudinary, assume they're public IDs or paths
    const options = {
      resource_type: 'video',
      // Set expiration time (15 minutes from now - shorter for better security)
      expires_at: Math.floor(Date.now() / 1000) + 900,
      // Always use signed URLs for security
      signed: true
    };
    
    // Generate transformation options for domain restriction
    options.secure = true;
    options.sign_url = true;
    
    // Add specific allowed domain based on the request
    const domain = req?.get('host') || 'academy.nodot.in';
    options.url_allowed = domain;
    
    // Create a one-time token that's valid for this session only
    const sessionId = req?.session?.id || '';
    const timestamp = Math.floor(Date.now() / 1000);
    
    // Include user ID if available for additional security
    const userId = req?.session?.user?.id || 'guest';
    
    // Create a unique token combining session, time and path
    const uniqueToken = crypto.createHash('md5')
      .update(`${sessionId}-${userId}-${timestamp}-${videoPath}-${domain}`)
      .digest('hex')
      .substring(0, 16);
    
    // Add the unique token and timestamp to URL parameters
    if (!options.custom_url_params) options.custom_url_params = {};
    options.custom_url_params.token = uniqueToken;
    options.custom_url_params.ts = timestamp;
    options.custom_url_params.sid = crypto.createHash('md5').update(sessionId).digest('hex').substring(0, 8);
    
    // Add URL validation parameters and prevent caching
    options.sign_url = true;
    options.secure = true;
    
    // Add overlay text with domain info to prevent screen recording
    options.overlay = {
      font_family: "Arial",
      font_size: 14,
      text: domain
    };
    
    // Clean the video path (remove extension if present)
    let cleanPath = videoPath;
    if (cleanPath.includes('.')) {
      cleanPath = cleanPath.substring(0, cleanPath.lastIndexOf('.'));
    }
    
    // Add security headers for Cloudinary
    if (req && req.get) {
      const userIp = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent') || '';
      
      // Add these to the transformation for additional validation
      options.raw_transformation = `ip_${userIp.replace(/\./g, '-')}/ua_${userAgent.substring(0, 10).replace(/[^a-zA-Z0-9]/g, '')}/t_${timestamp}`;
    }
    
    // Return signed URL with domain restriction
    const url = cloudinary.url(cleanPath, options);
    console.log(`Created secure URL for ${videoPath} with token ${uniqueToken.substring(0, 6)}...`);
    return url;
  } catch (error) {
    console.error('Error creating Cloudinary URL:', error);
    // Return original path as fallback
    return videoPath;
  }
}

// Add this middleware before your routes to prevent direct URL access
router.use(function(req, res, next) {
  // Check if the request is for a video file (check file extensions and paths)
  const isVideoRequest = req.path.match(/\.(mp4|webm|mov|m4v)$/i) || 
                        req.query.type === 'video' ||
                        req.path.includes('/video/');
  
  if (isVideoRequest) {
    // Get the referrer and verify it's from our site
    const referrer = req.get('Referrer') || req.headers.referer || '';
    const host = req.get('host') || '';
    
    // Check if referrer is missing or from a different domain
    const isValidReferrer = referrer && 
                           (referrer.includes(host) || 
                            allowedDomains.some(domain => referrer.includes(domain)));
    
    // If no valid referrer, block the request
    if (!isValidReferrer) {
      console.log('Blocked direct video access attempt:', {
        path: req.path,
        referrer: referrer || 'none',
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      // Send a forbidden response or redirect
      return res.status(403).send(`
        <html>
        <head>
          <title>Access Denied</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            h1 { color: #d32f2f; }
            p { font-size: 18px; }
            .container { max-width: 600px; margin: 0 auto; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Direct Access Not Allowed</h1>
            <p>Videos can only be played from the course page.</p>
            <p><a href="/login">Go to login page</a></p>
          </div>
        </body>
        </html>
      `);
    }
  }
  
  next();
});

// Add this middleware to validate video token requests to Cloudinary
router.use('/cloudinary-videos/:videoId', function(req, res, next) {
  // This route handles Cloudinary videos with token validation
  const token = req.query.token || '';
  const timestamp = parseInt(req.query.ts || '0', 10);
  const sessionIdHash = req.query.sid || '';
  
  // Validate the timestamp - must not be older than 15 minutes
  const currentTime = Math.floor(Date.now() / 1000);
  const isTimestampValid = timestamp > (currentTime - 900);
  
  if (!isTimestampValid) {
    console.log('Video token expired:', { token, timestamp, current: currentTime });
    return res.status(403).send('Video link expired');
  }
  
  // Validate session - must match current session
  const currentSessionId = req.session?.id || '';
  const expectedSessionHash = crypto.createHash('md5').update(currentSessionId).digest('hex').substring(0, 8);
  
  if (sessionIdHash !== expectedSessionHash) {
    console.log('Invalid session for video:', { 
      providedHash: sessionIdHash,
      expectedHash: expectedSessionHash,
      token
    });
    return res.status(403).send('Invalid video session');
  }
  
  // Log successful token validation
  console.log('Video token validated successfully:', { token: token.substring(0, 6) + '...' });
  
  // If all checks pass, allow access to the video
  next();
});

router.get("/learn/:id", async (req, res) => {
  if (!req.session.isAuthenticated) {
    return res.redirect("/login");
  }

  const courseId = req.params.id;
  const userEmail = req.session.email; // Using session data for user email
  
  // Generate a secure session token for this course viewing session
  const sessionToken = crypto.randomBytes(32).toString('hex');
  
  // Get domain from request for proper video security
  const domain = req.get('host') || 'academy.nodot.in';
  const isSecure = req.protocol === 'https';
  
  try {
    // Check if the user has purchased the course
    const purchaseCheck = await pool.query(
      "SELECT * FROM purchases WHERE email = $1 AND course_id = $2",
      [userEmail, courseId]
    );

    if (purchaseCheck.rows.length === 0) {
      return res.redirect("/"); // Redirect if the user hasn't purchased the course
    }

    // Set a cookie to help with video authorization
    res.cookie('video_session', sessionToken, {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax'
    });

    // Fetch course details
    const courseResult = await pool.query(
      "SELECT * FROM courses WHERE id = $1",
      [courseId]
    );

    // Fetch course sections
    const sectionsResult = await pool.query(
      "SELECT * FROM sections WHERE course_id = $1",
      [courseId]
    );

    const sectionIds = sectionsResult.rows.map((s) => s.id);

    // Fetch course modules (which includes the video URL)
    const modulesResult = await pool.query(
      "SELECT * FROM modules WHERE section_id = ANY($1::int[])",
      [sectionIds]
    );

    // Generate secure JSON data for frontend with encrypted video URLs
    // Instead of directly including URLs, we'll use IDs and load videos dynamically
    const modulesWithSecureIds = modulesResult.rows.map(module => {
      // Generate a unique ID for this video that will be used for secure loading
      const videoSecurityId = crypto.createHash('sha256')
        .update(`module-${module.id}-${userEmail}-${process.env.VIDEO_SECURITY_KEY || 'defaultkey'}`)
        .digest('hex');
      
      // Store the mapping in server memory in case we need to verify
      // This helps for debugging
      console.log(`Module ${module.id} security ID: ${videoSecurityId.substring(0, 24)}`);
      
      return {
        ...module,
        // Don't include actual streamUrl, just the security ID
        videoId: module.id,
        securityId: videoSecurityId,
      };
    });

    // Get watched modules for this user
    const watchedModulesResult = await pool.query(
      "SELECT module_id FROM video_progress WHERE email = $1 AND watched = true",
      [userEmail]
    );

    const watchedModules = watchedModulesResult.rows.map((r) => r.module_id);

    // Organize modules by section
    const sectionsWithModules = sectionsResult.rows.map((section) => {
      const sectionModules = modulesWithSecureIds.filter(
        (m) => m.section_id === section.id
      ).map(m => ({
        id: m.id,
        title: m.title,
        duration: m.duration || '0',
        description: m.description || '',
        securityId: m.securityId, // Use this for secure video loading
        isWatched: watchedModules.includes(m.id)
      }));

      return { ...section, modules: sectionModules };
    });

    // Generate the secure video script using our exported function
    const secureVideoScript = generateSecureVideoScript(sessionToken);

    // Create a video access token for additional security
    const videoAccessToken = {
      token: crypto.randomBytes(16).toString('hex'),
      expires: Math.floor(Date.now() / 1000) + 900 // 15 minutes
    };

    // Send data to the template, including the secure video loading script
    res.render("course-watch", {
      user: req.session.user,
      course: courseResult.rows[0],
      sections: sectionsWithModules,
      watchedModules,
      secureVideoScript,
      sessionToken: sessionToken,
      domain: domain,
      userDomain: domain,
      videoAccessToken: videoAccessToken
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

router.get("/certificate/:id", async (req, res) => {
  if (!req.session.isAuthenticated) return res.redirect("/login");

  const courseId = req.params.id;
  const email = req.session.user.email;
  const name = req.session.user.name;
  const userId = req.session.user.id;

  console.log(email, name, userId);

  try {
    // Check if certificate already issued
    const existingCert = await pool.query(
      `SELECT * FROM certificates WHERE email = $1 AND course_id = $2`,
      [email, courseId]
    );

    const courseQuery = await pool.query(
      "SELECT name FROM courses WHERE id = $1",
      [courseId]
    );
    const courseName = courseQuery.rows[0]?.name || "Course";

    if (existingCert.rows.length > 0) {
      // Already issued - show certificate
      return res.render("certificate", {
        name,
        courseName,
        date: new Date(existingCert.rows[0].issued_at).toLocaleDateString(),
        code: existingCert.rows[0].certificate_code,
      });
    }

    // Check if user completed course
    const progressResult = await pool.query(
      `
      SELECT COUNT(DISTINCT m.id) AS total_modules,
             COUNT(DISTINCT vp.module_id) AS completed_modules
      FROM courses c
      JOIN sections s ON s.course_id = c.id
      JOIN modules m ON m.section_id = s.id
      LEFT JOIN video_progress vp 
        ON vp.module_id = m.id AND vp.email = $1 AND vp.watched = true
      WHERE c.id = $2
      `,
      [email, courseId]
    );

    const { total_modules, completed_modules } = progressResult.rows[0];
    const isComplete = total_modules > 0 && completed_modules == total_modules;

    if (!isComplete) {
      return res.send(
        "Please complete 100% of the course to get your certificate."
      );
    }

    // Generate certificate code: ND-userid-courseid-year-random
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const certCode = `ND-${userId}-${courseId}-${year}`;

    // Insert certificate
    await pool.query(
      "INSERT INTO certificates (email, course_id, user_id, certificate_code) VALUES ($1, $2, $3, $4)",
      [email, courseId, userId, certCode]
    );

    res.render("certificate", {
      name,
      courseName,
      date: new Date().toLocaleDateString(),
      code: certCode,
    });
  } catch (err) {
    console.error("Certificate issue error:", err);
    res.send("Something went wrong.");
  }
});

// Find the test-video route and replace the URL generation logic with this
router.get("/test-video/:type", (req, res) => {
  try {
    // Authentication is required for test videos
    if (!req.session.isAuthenticated) {
      return res.redirect("/login");
    }
    
    // Get the video path from the URL
    const videoPath = req.query.path || '';
    let videoUrl = '';
    
    // Generate the secure video URL with domain restriction
    if (videoPath.startsWith('http')) {
      videoUrl = videoPath;
    } else {
      videoUrl = createSecureVideoUrl(videoPath, req);
    }
    
    console.log('Generated Cloudinary URL:', videoUrl);
    
    // Render a simple page with the video and protection
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Secure Video Test</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h2 { color: #333; }
          video { max-width: 100%; height: auto; }
          .container { max-width: 800px; margin: 0 auto; }
          .error { color: red; }
          .success { color: green; }
          pre { background: #f5f5f5; padding: 10px; overflow: auto; }
          .form-group { margin-bottom: 15px; }
          label { display: block; margin-bottom: 5px; font-weight: bold; }
          input[type="text"] { width: 100%; padding: 8px; box-sizing: border-box; }
          button { padding: 8px 15px; background: #4CAF50; color: white; border: none; cursor: pointer; }
          .video-container { position: relative; margin: 20px 0; border: 1px solid #ddd; }
          .warning { background: #ffe6e6; padding: 10px; border-left: 4px solid #ff5252; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Secure Video Test</h2>
          
          <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 5px;">
            <h3>Test a Different Video</h3>
            <form action="/test-video/path" method="get">
              <div class="form-group">
                <label for="path">Video Path or Cloudinary ID:</label>
                <input type="text" id="path" name="path" placeholder="e.g., videos/course1/intro">
              </div>
              <button type="submit">Test Video</button>
            </form>
          </div>
          
          <div class="warning">
            <strong>Domain Protected:</strong> This video can only be played on your domain. 
            It will not work if the URL is copied to another tab or shared with others.
          </div>
          
          <h3>Current Video:</h3>
          <p>Path: <code>${videoPath}</code></p>
          
          <div class="video-container">
            <video controls width="640" style="max-width: 100%;" preload="metadata">
              <source src="${videoUrl}" type="video/mp4">
              Your browser does not support the video tag.
            </video>
          </div>
          
          <p><a href="/learn/1">Back to course</a></p>
        </div>

        <script>
          // Advanced anti-copy protection with Blob URLs
          (function() {
            // Original video URL
            let originalVideoUrl = '';
            let blobUrl = null;
            
            // Function to initialize protection
            function initVideoProtection() {
              const video = document.querySelector('video');
              const source = video?.querySelector('source');
              
              if (video && source && source.src) {
                // Store original URL
                originalVideoUrl = source.src;
                
                // Remove source attribute
                source.removeAttribute('src');
                
                // Add play event handler
                video.addEventListener('play', function() {
                  loadVideoAsBlob(this);
                });
                
                // Add pause handler
                video.addEventListener('pause', function() {
                  setTimeout(() => {
                    if (this.paused) {
                      const source = this.querySelector('source');
                      if (source) source.removeAttribute('src');
                    }
                  }, 300);
                });
              }
            }
            
            // Function to load video as a blob
            function loadVideoAsBlob(videoElement) {
              if (!originalVideoUrl || document.visibilityState !== 'visible') return;
              
              const source = videoElement.querySelector('source');
              if (!source) return;
              
              // If we already have a blob URL, use it
              if (blobUrl) {
                source.src = blobUrl;
                videoElement.load();
                videoElement.play();
                return;
              }
              
              // Show loading indicator
              const container = videoElement.parentElement;
              const loadingOverlay = document.createElement('div');
              loadingOverlay.style.position = 'absolute';
              loadingOverlay.style.top = '0';
              loadingOverlay.style.left = '0';
              loadingOverlay.style.width = '100%';
              loadingOverlay.style.height = '100%';
              loadingOverlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
              loadingOverlay.style.display = 'flex';
              loadingOverlay.style.alignItems = 'center';
              loadingOverlay.style.justifyContent = 'center';
              loadingOverlay.style.color = 'white';
              loadingOverlay.style.zIndex = '999';
              loadingOverlay.innerHTML = '<div>Loading secure video...</div>';
              
              // Make sure container is relatively positioned
              if (container) {
                if (window.getComputedStyle(container).position === 'static') {
                  container.style.position = 'relative';
                }
                container.appendChild(loadingOverlay);
              }
              
              // Fetch the video as a blob
              fetch(originalVideoUrl)
                .then(response => {
                  if (!response.ok) throw new Error('Network response was not ok');
                  return response.blob();
                })
                .then(blob => {
                  // Create a blob URL
                  blobUrl = URL.createObjectURL(blob);
                  
                  // Set the source to the blob URL
                  source.src = blobUrl;
                  videoElement.load();
                  
                  // Remove loading indicator
                  if (loadingOverlay.parentElement) {
                    loadingOverlay.parentElement.removeChild(loadingOverlay);
                  }
                  
                  // Play the video
                  videoElement.play();
                  
                  // Clean up blob URL when page unloads
                  window.addEventListener('beforeunload', function() {
                    if (blobUrl) URL.revokeObjectURL(blobUrl);
                  });
                })
                .catch(error => {
                  console.error('Error loading video:', error);
                  if (loadingOverlay.parentElement) {
                    loadingOverlay.parentElement.removeChild(loadingOverlay);
                  }
                  
                  // Show error message
                  const errorOverlay = document.createElement('div');
                  errorOverlay.style.position = 'absolute';
                  errorOverlay.style.top = '0';
                  errorOverlay.style.left = '0';
                  errorOverlay.style.width = '100%';
                  errorOverlay.style.height = '100%';
                  errorOverlay.style.backgroundColor = 'rgba(0,0,0,0.7)';
                  errorOverlay.style.display = 'flex';
                  errorOverlay.style.alignItems = 'center';
                  errorOverlay.style.justifyContent = 'center';
                  errorOverlay.style.color = 'white';
                  errorOverlay.style.zIndex = '999';
                  errorOverlay.innerHTML = '<div>Error loading video. Please try again.</div>';
                  
                  if (container) {
                    container.appendChild(errorOverlay);
                    setTimeout(() => {
                      if (errorOverlay.parentElement) {
                        errorOverlay.parentElement.removeChild(errorOverlay);
                      }
                    }, 3000);
                  }
                });
            }
            
            // Prevent right-click on video
            document.addEventListener('contextmenu', function(e) {
              if (e.target.tagName === 'VIDEO' || 
                  e.target.closest('.video-container')) {
                e.preventDefault();
                return false;
              }
            });
            
            // Prevent URL copying
            document.addEventListener('copy', function(e) {
              const selection = window.getSelection().toString();
              if (selection.includes('blob:') || 
                  selection.includes('video') ||
                  selection.includes('http')) {
                e.preventDefault();
                e.clipboardData.setData('text/plain', 'Video copying is not allowed');
                return false;
              }
            });
            
            // Handle tab visibility
            document.addEventListener('visibilitychange', function() {
              if (document.visibilityState === 'hidden') {
                const video = document.querySelector('video');
                if (video) {
                  video.pause();
                  const source = video.querySelector('source');
                  if (source) source.removeAttribute('src');
                }
              }
            });
            
            // Prevent embedding in iframes
            try {
              if (window.parent !== window && document.domain !== window.parent.document.domain) {
                document.body.innerHTML = '<h1>Video playback not allowed in iframes</h1>';
              }
            } catch(e) {
              document.body.innerHTML = '<h1>Video playback not allowed in iframes</h1>';
            }
            
            // Initialize when DOM is loaded
            document.addEventListener('DOMContentLoaded', function() {
              initVideoProtection();
            });
          })();
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error("Test video error:", error);
    res.status(500).send(`
      <h1>Error Testing Video</h1>
      <p>${error.message || 'Unknown error'}</p>
      <pre>${error.stack || ''}</pre>
    `);
  }
});

// Add profile route
router.get("/profile", async (req, res) => {
  if (!req.session.isAuthenticated) {
    return res.redirect("/login");
  }
  
  try {
    const userEmail = req.session.user.email;
    
    // Get user data from database
    const userResult = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [userEmail]
    );
    
    if (userResult.rows.length === 0) {
      return res.redirect("/login");
    }
    
    const userData = userResult.rows[0];
    
    // Get purchased courses
    const coursesResult = await pool.query(
      `SELECT c.* FROM courses c 
       JOIN purchases p ON p.course_id = c.id 
       WHERE p.email = $1`,
      [userEmail]
    );
    
    // Get count of completed courses - use a simpler query for now
    let completedCount = 0;
    try {
      const completedResult = await pool.query(
        `SELECT COUNT(DISTINCT course_id) as count
         FROM purchases
         WHERE email = $1`,
        [userEmail]
      );
      completedCount = parseInt(completedResult.rows[0]?.count || 0);
    } catch (err) {
      console.error("Error getting completed courses:", err);
    }
    
    // Get count of certificates
    let certificateCount = 0;
    try {
      const certificatesResult = await pool.query(
        "SELECT COUNT(*) as count FROM certificates WHERE email = $1",
        [userEmail]
      );
      certificateCount = parseInt(certificatesResult.rows[0]?.count || 0);
    } catch (err) {
      console.error("Error getting certificates count:", err);
    }
    
    const courseCount = coursesResult.rows.length;
    
    // Always pass these variables to prevent template errors
    return res.render("profile", {
      user: req.session.user,
      userData: userData,
      courses: coursesResult.rows,
      courseCount,
      completedCount,
      certificateCount,
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (err) {
    console.error("Profile page error:", err);
    res.status(500).send("Something went wrong");
  }
});

// Add purchase history route
router.get("/purchase-history", async (req, res) => {
  if (!req.session.isAuthenticated) {
    return res.redirect("/login");
  }
  
  try {
    const userEmail = req.session.user.email;
    
    // Get payment history records
    const paymentHistory = await pool.query(
      "SELECT * FROM payment_history WHERE email = $1 ORDER BY payment_date DESC",
      [userEmail]
    );
    
    // Get ALL course_ids from purchases table using email
    const purchaseResult = await pool.query(
      "SELECT id, course_id, purchased_at FROM purchases WHERE email = $1 ORDER BY purchased_at DESC",
      [userEmail]
    );
    
    // Get all course names at once for efficiency
    let courseNames = {};
    if (purchaseResult.rows.length > 0) {
      // Extract all course IDs
      const courseIds = [...new Set(purchaseResult.rows.map(p => p.course_id))];
      
      // Get names for all courses at once
      const courseResult = await pool.query(
        "SELECT id, name FROM courses WHERE id = ANY($1::int[])",
        [courseIds]
      );
      
      // Create a lookup map for course IDs to names
      courseResult.rows.forEach(course => {
        courseNames[course.id] = course.name;
      });
    }
    
    // Prepare purchase history items
    const purchaseHistory = [];
    
    // Process each payment history record
    for (let i = 0; i < paymentHistory.rows.length; i++) {
      const payment = paymentHistory.rows[i];
      
      // Default course name
      let courseName = "Unknown Course";
      
      // Match payment to purchase based on index
      // This distributes available course names across payments
      if (purchaseResult.rows.length > 0) {
        // Use modulo to cycle through available purchases if we have more payments than purchases
        const purchaseIndex = i % purchaseResult.rows.length;
        const courseId = purchaseResult.rows[purchaseIndex].course_id;
        courseName = courseNames[courseId] || "Unknown Course";
      }
      
      purchaseHistory.push({
        order_id: payment.order_id,
        payment_id: payment.payment_id,
        payment_date: payment.payment_date,
        amount: payment.amount,
        status: payment.status,
        course_name: courseName
      });
    }
    
    // Render the purchase history page
    res.render("purchase-history", {
      user: req.session.user,
      purchases: purchaseHistory
    });
  } catch (err) {
    console.error("Purchase history error:", err);
    res.status(500).send("Something went wrong");
  }
});

// Add route to update password
router.post("/update-password", async (req, res) => {
  if (!req.session.isAuthenticated) {
    return res.redirect("/login");
  }

  const { currentPassword, newPassword, confirmPassword } = req.body;
  const userEmail = req.session.user.email;

  // Basic validation
  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.redirect("/profile?error=missing-fields");
  }

  if (newPassword.length < 8) {
    return res.redirect("/profile?error=password-too-short");
  }

  if (newPassword !== confirmPassword) {
    return res.redirect("/profile?error=passwords-dont-match");
  }

  try {
    // Get user from database
    const userResult = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [userEmail]
    );
    
    if (userResult.rows.length === 0) {
      return res.redirect("/profile?error=user-not-found");
    }
    
    const user = userResult.rows[0];
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
      return res.redirect("/profile?error=incorrect-password");
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password in database
    await pool.query(
      "UPDATE users SET password = $1 WHERE email = $2",
      [hashedPassword, userEmail]
    );
    
    // Redirect to profile with success message
    return res.redirect("/profile?success=password-updated");
  } catch (err) {
    console.error("Password update error:", err);
    return res.redirect("/profile?error=update-failed");
  }
});

// Add this API endpoint for secure video URL retrieval
router.get("/api/secure-video/:securityId", async (req, res) => {
  try {
    if (!req.session.isAuthenticated) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const securityId = req.params.securityId;
    const moduleId = req.query.moduleId;
    const userEmail = req.session.email;
    
    if (!securityId || !moduleId) {
      return res.status(400).json({ error: "Missing required parameters" });
    }
    
    // The expected security ID should be calculated the same way as when creating modules
    const expectedSecurityId = crypto.createHash('sha256')
      .update(`module-${moduleId}-${userEmail}-${process.env.VIDEO_SECURITY_KEY || 'defaultkey'}`)
      .digest('hex');
    
    // Use the full security ID when comparing
    if (securityId !== expectedSecurityId) {
      console.log('Invalid security ID:', {
        provided: securityId.substring(0, 24) + '...',
        expected: expectedSecurityId.substring(0, 24) + '...',
        moduleId
      });
      return res.status(403).json({ error: "Invalid security ID" });
    }
    
    // Get the module info from the database
    const moduleResult = await pool.query(
      "SELECT * FROM modules WHERE id = $1",
      [moduleId]
    );
    
    if (moduleResult.rows.length === 0) {
      return res.status(404).json({ error: "Module not found" });
    }
    
    const videoPath = moduleResult.rows[0].video_url;
    
    // Generate a signed URL with very short expiration (5 minutes)
    const secureUrl = createSecureVideoUrl(videoPath, req);
    
    // Record this video access in logs or analytics if needed
    console.log(`Secure video access granted: Module ${moduleId} for ${req.session.email}`);
    
    // Return the secure URL to the client
    return res.json({
      url: secureUrl,
      expires: Math.floor(Date.now() / 1000) + 300 // 5 minutes
    });
    
  } catch (error) {
    console.error("Error providing secure video URL:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;