import express from "express";
import pool from "../DB/index.js";
import bcrypt from "bcrypt";

const router = express.Router();

router.get("/NODOTacademyADMIN", (req, res) => {
  res.render("adminlogin");
});

router.post("/admin", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Query to find the admin in the admin-specific table
    const checkResult = await pool.query(
      "SELECT * FROM admin WHERE email = $1",
      [email]
    );

    if (checkResult.rows.length > 0) {
      const admin = checkResult.rows[0];
      const storedPassword = admin.password;

      // Compare password with stored password using bcrypt
      bcrypt.compare(password, storedPassword, (error, result) => {
        if (result) {
          // Set session data for the authenticated admin
          req.session.isAdminAuthenticated = true;
          req.session.admin = {
            email: admin.email,
            role: "admin", // role for access control
          };

          // After successful login, redirect to the admin panel
          return res.redirect("/nodotadminpanel");
        } else {
          // Password mismatch
          res.render("adminlogin", { "error-message": "Incorrect password" });
        }
      });
    } else {
      // Email not found in admin table
      res.render("adminlogin", { "error-message": "you are not the admin" });
    }
  } catch (error) {
    // Catch database or other errors
    console.error(error);
    res.render("adminlogin", {
      "error-message": "Error occurred. Please try again",
    });
  }
});

export default router;
