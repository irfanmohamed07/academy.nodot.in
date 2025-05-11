import express from "express";
import pool from "../DB/index.js";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.get("/signup", (req, res) => {
  res.render("signup", { user: req.session.user || null });
});

router.post("/signup", async (req, res) => {
  const { name, email, mobile, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.render("signup", {
      user: req.session.user || null,
      errorMessage: "Passwords do not match",
    });
  }

  try {
    // Check if email already exists
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    if (existingUser.rows.length > 0) {
      return res.render("signup", {
        user: req.session.user || null,
        errorMessage: "Email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Set token expiration to 24 hours from now
    const tokenExpiration = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Insert user with verification token and set is_verified to false initially
    await pool.query(
      `INSERT INTO users (name, email, mobile, password, verification_token, verification_token_expiration, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [name, email, mobile, hashedPassword, verificationToken, tokenExpiration, false]
    );
    
    // Send verification email
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "nodot.in.official@gmail.com",
          pass: process.env.MAIL_PASS || "zqzc fntp rfao ysur", // Use app password
        },
      });

      // Always use the production URL for verification links
      const baseURL = 'https://academy.nodot.in';
      
      const verificationLink = `${baseURL}/verify-email/${verificationToken}`;
      
      const mailOptions = {
        from: '"Nodot Academy" <nodot.in.official@gmail.com>',
        to: email,
        subject: "Verify Your Email - Nodot Academy",
        html: `
          <div style="font-family: Arial, sans-serif; text-align: center; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <img src="https://academy.nodot.in/public/images/logo.jpg" alt="Nodot Academy Logo" style="max-width: 150px; margin-bottom: 20px;">
            <h2 style="color: #5624d0;">Welcome to Nodot Academy, ${name}!</h2>
            <p>Thanks for signing up. To complete your registration, please verify your email address by clicking the button below:</p>
            
            <div style="margin: 30px 0;">
              <a href="${verificationLink}" style="background-color: #5624d0; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email Address</a>
            </div>
            
            <p>This verification link will expire in 24 hours.</p>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; font-size: 12px; color: #666;">${verificationLink}</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p>🚀 Affordable courses</p>
              <p>💼 Internship opportunities</p>
              <p>📜 Skill-based certifications</p>
              <p>🌐 Visit us: <a href="https://academy.nodot.in" target="_blank" style="color: #5624d0;">nodotacademy</a></p>
            </div>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log("Verification email sent to:", email);
    } catch (mailError) {
      console.error("Failed to send verification email:", mailError.message);
    }

    // Redirect to a page informing user to check their email
    res.render("email-verification-sent", { 
      email,
      user: null
    });
  } catch (err) {
    console.error(err);
    res.render("signup", {
      user: req.session.user || null,
      errorMessage: "Something went wrong. Please try again.",
    });
  }
});

// Email verification route
router.get("/verify-email/:token", async (req, res) => {
  const { token } = req.params;
  
  try {
    // Find user with this verification token that hasn't expired
    const result = await pool.query(
      "SELECT * FROM users WHERE verification_token = $1 AND verification_token_expiration > NOW()",
      [token]
    );
    
    if (result.rows.length === 0) {
      return res.render("verification-failed", { 
        user: req.session.user || null,
        message: "Invalid or expired verification link. Please sign up again."
      });
    }
    
    // Update user as verified
    await pool.query(
      "UPDATE users SET is_verified = true, verification_token = NULL, verification_token_expiration = NULL WHERE verification_token = $1",
      [token]
    );
    
    res.render("verification-success", { 
      user: req.session.user || null
    });
  } catch (err) {
    console.error("Verification error:", err);
    res.render("verification-failed", {
      user: req.session.user || null,
      message: "Something went wrong. Please try again later."
    });
  }
});

export default router;
