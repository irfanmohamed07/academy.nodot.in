import pool from '../DB/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupVideoSecurity() {
  console.log('Setting up video security system...');
  
  try {
    // Read and execute the SQL file to create the video_access_log table
    const sqlPath = path.join(__dirname, '..', 'DB', 'video_access_log.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Creating video_access_log table...');
    await pool.query(sql);
    console.log('✅ Video access log table created successfully');
    
    // Check if VIDEO_SECURITY_KEY is set in environment
    if (!process.env.VIDEO_SECURITY_KEY) {
      console.log('⚠️ VIDEO_SECURITY_KEY is not set in environment');
      console.log('Generating a random security key...');
      
      // Generate a random security key
      const securityKey = crypto.randomBytes(32).toString('hex');
      
      console.log(`\nAdd this to your .env file:\nVIDEO_SECURITY_KEY=${securityKey}\n`);
    } else {
      console.log('✅ VIDEO_SECURITY_KEY is set in environment');
    }
    
    // Check if Cloudinary config is set
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.log('⚠️ Cloudinary configuration is not complete');
      console.log('You need to set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file');
    } else {
      console.log('✅ Cloudinary configuration is complete');
    }
    
    console.log('\nVideo security setup complete!');
    
  } catch (error) {
    console.error('Error setting up video security:', error);
    process.exit(1);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the setup
setupVideoSecurity().catch(console.error); 