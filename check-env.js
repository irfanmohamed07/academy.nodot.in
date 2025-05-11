import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('Environment Variable Check:');
console.log('---------------------------');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID);
console.log('RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? 'Secret exists (not showing for security)' : 'Missing');
console.log('MAIL_PASS:', process.env.MAIL_PASS ? 'Password exists (not showing for security)' : 'Missing');
console.log('---------------------------');

// Check if required values are present
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.error('WARNING: Razorpay credentials are missing or invalid!');
  console.error('Please make sure your .env file contains valid RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET values.');
} else {
  console.log('Razorpay credentials found!');
} 