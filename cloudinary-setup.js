// Cloudinary Setup Guide for Video Streaming

/**
 * Follow these steps to set up Cloudinary for secure video streaming:
 * 
 * 1. Create a Cloudinary account at https://cloudinary.com/
 * 2. Get your cloud name, API key, and API secret from your Cloudinary dashboard
 * 3. Add these to your .env file:
 *    CLOUDINARY_CLOUD_NAME=your_cloud_name
 *    CLOUDINARY_API_KEY=your_api_key
 *    CLOUDINARY_API_SECRET=your_api_secret
 * 
 * 4. Upload your videos to Cloudinary:
 *    - Via the Cloudinary dashboard (easiest for testing)
 *    - Via API using the code below
 *    - Organize videos in folders matching your current structure
 * 
 * 5. Update your video paths in the database:
 *    - If using public IDs: Simply use the Cloudinary public ID without extension
 *      Example: "videos/course1/intro" (not "videos/course1/intro.mp4")
 * 
 * 6. Restart your application
 */

// Example: Upload a video to Cloudinary programmatically
import cloudinary from 'cloudinary';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Example function to upload a video
async function uploadVideo(filePath, publicId) {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return null;
    }
    
    console.log(`Uploading ${filePath} to Cloudinary as ${publicId}...`);
    
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'video',
      public_id: publicId,
      overwrite: true,
      // Add these for enhanced security
      access_mode: 'authenticated',
      type: 'authenticated'
    });
    
    console.log(`Upload successful! URL: ${result.secure_url}`);
    return result;
  } catch (error) {
    console.error('Upload failed:', error);
    return null;
  }
}

// Example: Batch upload videos from a directory
async function batchUploadVideos(dirPath, cloudinaryFolder) {
  try {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      if (file.match(/\.(mp4|webm|mov)$/i)) {
        const filePath = path.join(dirPath, file);
        const publicId = `${cloudinaryFolder}/${file.split('.')[0]}`;
        
        await uploadVideo(filePath, publicId);
      }
    }
    
    console.log('Batch upload complete!');
  } catch (error) {
    console.error('Batch upload failed:', error);
  }
}

// Example usage (uncomment to run):
// uploadVideo('./videos/course1/intro.mp4', 'videos/course1/intro');
// batchUploadVideos('./videos/course1', 'videos/course1');

export { uploadVideo, batchUploadVideos }; 