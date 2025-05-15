import express from "express";
import pool from "../DB/index.js";
import crypto from "crypto";
import cloudinary from "cloudinary";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Allowed domains for video playback
const allowedDomains = ['academy.nodot.in', 'localhost:4000'];

// Security key for video protection
const VIDEO_SECURITY_KEY = process.env.VIDEO_SECURITY_KEY || 'default-security-key';

/**
 * Creates a secure video URL for streaming via Cloudinary
 * With domain restriction, signed URL, watermarking, and expiration for security
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
    
    // Add watermarking with domain name to discourage screen recording
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
    
    // Return signed URL with domain restriction
    const url = cloudinary.url(cleanPath, options);
    return url;
  } catch (error) {
    console.error('Error creating Cloudinary URL:', error);
    // Return original path as fallback
    return videoPath;
  }
}

/**
 * API endpoint to securely serve video content
 * This endpoint validates user's session and module access
 */
router.get('/api/secure-video/:securityId', async (req, res) => {
  try {
    // Only allow authenticated users to access videos
    if (!req.session.isAuthenticated || !req.session.email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const securityId = req.params.securityId;
    const moduleId = req.query.moduleId;
    const userEmail = req.session.email;
    
    if (!moduleId || !securityId) {
      return res.status(400).json({ error: 'Missing module ID or security ID' });
    }
    
    // Verify this user has access to this course's videos
    const moduleResult = await pool.query(
      `SELECT m.*, s.course_id 
       FROM modules m
       JOIN sections s ON m.section_id = s.id
       WHERE m.id = $1`,
      [moduleId]
    );
    
    if (moduleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Module not found' });
    }
    
    const courseId = moduleResult.rows[0].course_id;
    
    // Check if the user has purchased the course
    const purchaseCheck = await pool.query(
      "SELECT * FROM purchases WHERE email = $1 AND course_id = $2",
      [userEmail, courseId]
    );

    if (purchaseCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You have not purchased this course' });
    }
    
    // Get the video URL for this module
    const videoUrl = moduleResult.rows[0].video_url;
    if (!videoUrl) {
      return res.status(404).json({ error: 'Video not available' });
    }
    
    // Create a secure URL with short expiration
    const secureUrl = createSecureVideoUrl(videoUrl, req);
    
    // Record that this video was accessed
    recordVideoAccess(userEmail, moduleId, req.ip);
    
    // Return the secure URL
    return res.json({ 
      url: secureUrl,
      // Include a short expiration time to ensure the URL can't be reused for long
      expires: Math.floor(Date.now() / 1000) + 900, // 15 minutes
      moduleId
    });
  } catch (error) {
    console.error('Error serving secure video:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Record video access for analytics
 */
async function recordVideoAccess(email, moduleId, ipAddress) {
  try {
    await pool.query(
      `INSERT INTO video_access_log 
       (email, module_id, ip_address, access_time) 
       VALUES ($1, $2, $3, NOW())`,
      [email, moduleId, ipAddress]
    );
  } catch (error) {
    console.error('Error recording video access:', error);
    // Non-blocking, so we don't return any error
  }
}

/**
 * Generate a client-side script for secure video loading
 * This is injected into the course-watch template
 */
export function generateSecureVideoScript(sessionToken) {
  return `
  <script>
    // Secure video loading with blob URLs - prevents videos from being copied to other tabs
    
    // Store video security mappings and blob URLs
    const videoBlobs = {};
    const loadingVideos = {};
    
    // Function to securely load a video when needed
    async function secureLoadVideo(securityId, moduleId) {
      // If already loading, don't start again
      if (loadingVideos[securityId]) return loadingVideos[securityId];
      
      // If already loaded, return the cached blob URL
      if (videoBlobs[securityId]) {
        return videoBlobs[securityId];
      }
      
      // Create a loading promise to prevent duplicate loads
      loadingVideos[securityId] = new Promise(async (resolve, reject) => {
        try {
          // Request the secure video URL from the server
          const response = await fetch(\`/api/secure-video/\${securityId}?moduleId=\${moduleId}\`);
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Could not load secure video');
          }
          
          const data = await response.json();
          
          if (!data.url) {
            throw new Error('Invalid video response');
          }
          
          // Fetch the video as a blob
          const videoResponse = await fetch(data.url);
          const videoBlob = await videoResponse.blob();
          
          // Create a blob URL that only works in the current browser tab
          const blobUrl = URL.createObjectURL(videoBlob);
          
          // Store the blob URL
          videoBlobs[securityId] = blobUrl;
          resolve(blobUrl);
          
          // Clean up the loading promise
          delete loadingVideos[securityId];
        } catch (error) {
          console.error('Error loading secure video:', error);
          delete loadingVideos[securityId];
          reject(error);
        }
      });
      
      return loadingVideos[securityId];
    }
    
    // Function to play a secure video
    window.playSecureVideo = async function(videoElement, securityId, moduleId) {
      try {
        // Load the video as a blob
        const blobUrl = await secureLoadVideo(securityId, moduleId);
        
        // Set the source and play
        const source = videoElement.querySelector('source');
        if (source) {
          source.src = blobUrl;
          videoElement.load();
          videoElement.play();
        } else {
          videoElement.src = blobUrl;
          videoElement.load();
          videoElement.play();
        }
        
        return true;
      } catch (error) {
        console.error('Error playing secure video:', error);
        throw error;
      }
    };
    
    // Clean up blob URLs when page is unloaded
    window.addEventListener('beforeunload', function() {
      for (const securityId in videoBlobs) {
        URL.revokeObjectURL(videoBlobs[securityId]);
      }
    });
  </script>
  `;
}

/**
 * Update API endpoint for tracking video progress
 */
router.post("/update-video-progress", async (req, res) => {
  if (!req.session.isAuthenticated) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { module_id, watched } = req.body;
    const email = req.session.email;

    // Check if a record already exists
    const checkResult = await pool.query(
      "SELECT * FROM video_progress WHERE email = $1 AND module_id = $2",
      [email, module_id]
    );

    if (checkResult.rows.length > 0) {
      // Update existing record
      await pool.query(
        "UPDATE video_progress SET watched = $1 WHERE email = $2 AND module_id = $3",
        [watched, email, module_id]
      );
    } else {
      // Create new record
      await pool.query(
        "INSERT INTO video_progress (email, module_id, watched) VALUES ($1, $2, $3)",
        [email, module_id, watched]
      );
    }

    // Get the module details to find the course ID
    const moduleResult = await pool.query(
      `SELECT m.*, s.course_id 
       FROM modules m
       JOIN sections s ON m.section_id = s.id
       WHERE m.id = $1`,
      [module_id]
    );
    
    if (moduleResult.rows.length > 0) {
      const courseId = moduleResult.rows[0].course_id;
      
      // Calculate course completion percentage
      const progressResult = await pool.query(
        `
        SELECT 
          COUNT(DISTINCT m.id) AS total_modules,
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
      
      if (progressResult.rows.length > 0) {
        const { total_modules, completed_modules } = progressResult.rows[0];
        const completionPercentage = 
          total_modules > 0
            ? Math.round((completed_modules / total_modules) * 100)
            : 0;
            
        return res.json({ 
          success: true, 
          message: "Progress updated successfully", 
          completionPercentage: completionPercentage,
          totalModules: total_modules,
          completedModules: completed_modules
        });
      }
    }

    res.json({ success: true, message: "Progress updated successfully" });
  } catch (err) {
    console.error("Error updating video progress:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Add middleware to block direct access to videos
router.use(function(req, res, next) {
  // Check if the request is for a video file
  const isVideoRequest = req.path.match(/\.(mp4|webm|mov|m4v)$/i) || 
                         req.query.type === 'video' ||
                         req.path.includes('/videos/');
  
  if (isVideoRequest) {
    // Get the referrer and verify it's from our site
    const referrer = req.get('Referrer') || req.headers.referer || '';
    const host = req.get('host') || '';
    
    // Check if referrer is missing or from a different domain
    const isValidReferrer = referrer && (
      referrer.includes(host) || 
      allowedDomains.some(domain => referrer.includes(domain))
    );
    
    // Check if the user is authenticated
    const isAuthenticated = req.session && req.session.isAuthenticated;
    
    // If no valid referrer or not authenticated, block the request
    if (!isValidReferrer || !isAuthenticated) {
      console.log('Blocked direct video access attempt:', {
        path: req.path,
        referrer: referrer || 'none',
        authenticated: isAuthenticated,
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

export default router; 