import express from "express";
import pool from "../DB/index.js";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import crypto from "crypto";
import dotenv from "dotenv";

const router = express.Router();
dotenv.config();

router.get("/login", (req, res) => {
  res.render("login", { user: req.session.user || null });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (result.rows.length === 0) {
      return res.render("login", {
        user: req.session.user || null,
        error: "Username not found",
      });
    }

    const user = result.rows[0];

    // Check if user has verified their email
    if (user.is_verified === false) {
      return res.render("login", {
        user: req.session.user || null,
        error: "Please verify your email address before logging in. Check your inbox for the verification link.",
        unverified: true,
        email: email
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.render("login", {
        user: req.session.user || null,
        error: "Invalid username or password",
      });
    }
    req.session.isAuthenticated = true;
    req.session.email = email;
    // ✅ Store user in session
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar || "/images/default-avatar.png", // Provide a default avatar if not set
    };
    console.log(req.session.user);

    res.redirect("/");
  } catch (err) {
    console.log(err);
    res.render("login", {
      user: req.session.user || null,
      error: "An error occurred",
    });
  }
});

// Route to resend verification email
router.post("/resend-verification", async (req, res) => {
  const { email } = req.body;

  try {
    // Check if user exists and is not verified
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1 AND is_verified = false",
      [email]
    );

    if (result.rows.length === 0) {
      return res.render("login", {
        user: req.session.user || null,
        error: "Email not found or already verified",
      });
    }

    const user = result.rows[0];
    
    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Set token expiration to 24 hours from now
    const tokenExpiration = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Update user with new token
    await pool.query(
      "UPDATE users SET verification_token = $1, verification_token_expiration = $2 WHERE email = $3",
      [verificationToken, tokenExpiration, email]
    );

    // Send verification email
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
          <img src="https://academy.nodot.in/images/logo2.png" alt="Nodot Academy Logo" style="max-width: 150px; margin-bottom: 20px;">
          <h2 style="color: #5624d0;">Welcome to Nodot Academy, ${user.name}!</h2>
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
    
    return res.render("email-verification-sent", { 
      email,
      user: null,
      resent: true
    });
    
  } catch (err) {
    console.error("Resend verification error:", err);
    res.render("login", {
      user: req.session.user || null,
      error: "Failed to resend verification email. Please try again later.",
    });
  }
});

router.get("/forgotpassword", (req, res) => {
  res.render("forgotpassword", { user: req.session.user || null });
});

router.post("/userforgotpassword", async (req, res) => {
  const { email } = req.body;

  // Check if email exists in the database
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (result.rows.length === 0) {
      return res.render("forgotpassword", {
        user: req.session.user || null,
        errorMessage: "Email not found. Please try again.",
      });
    }

    // Generate a reset token
    const resetToken = crypto.randomBytes(20).toString("hex");

    // Set token expiration to 1 hour from now
    const resetTokenExpiration = new Date(Date.now() + 3600000);

    // Update the user's record with the reset token and expiration
    await pool.query(
      "UPDATE users SET reset_token = $1, reset_token_expiration = $2 WHERE email = $3",
      [resetToken, resetTokenExpiration, email]
    );

    // Send the reset link to the user's email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "nodot.in.official@gmail.com", // Your email
        pass: process.env.MAIL_PASS || "zqzc fntp rfao ysur", // Use an app-specific password
      },
    });

    // Always use the production URL for reset links
    const baseURL = 'https://academy.nodot.in';
    
    const resetLink = `${baseURL}/resetpassword/${resetToken}`;

    const mailOptions = {
      from: '"Nodot Academy" <nodot.in.official@gmail.com>',
      to: email,
      subject: "Password Reset Request",
      html: `
          <div style="font-family: Arial, sans-serif; text-align: center;">
            <h2>Password Reset Request</h2>
            <p>You requested a password reset. Click the link below to reset your password:</p>
            <a href="${resetLink}" style="background-color: #5624d0; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
            <p>If you did not request this, please ignore this email.</p>
          </div>
        `,
    };

    await transporter.sendMail(mailOptions);

    // Respond back to the user
    res.render("forgotpassword", {
      user: req.session.user || null,
      successMessage: "A password reset link has been sent to your email.",
    });
  } catch (err) {
    console.error(err);
    res.render("forgotpassword", {
      user: req.session.user || null,
      errorMessage: "Something went wrong. Please try again later.",
    });
  }
});

// GET route for rendering the reset password page
router.get("/resetpassword/:token", async (req, res) => {
  const { token } = req.params;

  try {
    // Check if the token exists in the database and is not expired
    const result = await pool.query(
      "SELECT * FROM users WHERE reset_token = $1 AND reset_token_expiration > NOW()",
      [token]
    );

    if (result.rows.length === 0) {
      return res.render("forgotpassword", {
        errorMessage: "Invalid or expired reset token. Please try again.",
        user: req.session.user || null,
        token: null, // still define token, even if null
      });
    }
    // If token is valid, render the reset password form
    res.render("resetpassword", { token, errorMessage: null });
  } catch (err) {
    console.error(err);
    res.render("resetpassword", {
      errorMessage: "Something went wrong. Please try again later.",
    });
  }
});

// POST route for handling password reset
router.post("/resetpassword/:token", async (req, res) => {
  const { token } = req.params;
  const { newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    return res.render("resetpassword", {
      token,
      errorMessage: "Passwords do not match. Please try again.",
    });
  }

  try {
    // Check if the token exists and is valid
    const result = await pool.query(
      "SELECT * FROM users WHERE reset_token = $1 AND reset_token_expiration > NOW()",
      [token]
    );

    if (result.rows.length === 0) {
      return res.render("resetpassword", {
        errorMessage:
          "Invalid or expired reset token. Please request a new one.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password in the database
    await pool.query(
      "UPDATE users SET password = $1, reset_token = NULL, reset_token_expiration = NULL WHERE reset_token = $2",
      [hashedPassword, token]
    );

    // Redirect to login page or show success message
    res.redirect("/login");
  } catch (err) {
    console.error(err);
    res.render("resetpassword", {
      token, // Pass token back to the form
      errorMessage: "Something went wrong. Please try again later.",
    });
  }
});

// Route to destroy session and logout user
router.post("/logout", (req, res) => {
  // Destroy the session
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).send("Error logging out");
    }
    // Redirect to the home page after logout
    res.redirect("/");
  });
});

export default router;
