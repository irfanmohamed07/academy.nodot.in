import pool from './index.js';

async function runMigrations() {
  try {
    console.log('Starting database migrations...');
    
    // Add email verification columns to users table
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
    `);
    
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255);
    `);
    
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS verification_token_expiration TIMESTAMP;
    `);
    
    console.log('Email verification columns added to users table');
    
    // Mark existing users as verified
    await pool.query(`
      UPDATE users 
      SET is_verified = TRUE 
      WHERE is_verified IS NULL;
    `);
    
    console.log('Existing users marked as verified');
    
    console.log('Migrations completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    // Close the pool
    pool.end();
  }
}

runMigrations(); 