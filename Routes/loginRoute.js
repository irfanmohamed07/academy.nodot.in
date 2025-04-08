import express from "express";
import pool from "../DB/index.js";
import bcrypt from "bcrypt";

const router = express.Router();

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
        error: "username not found",
      });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.render("login", {
        user: req.session.user || null,
        error: "invlid username or password",
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
    res.render("login", {
      user: req.session.user || null,
      error: "An error occured",
    });
  }
});

export default router;
