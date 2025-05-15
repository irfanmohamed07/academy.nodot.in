import express from "express";
import pool from "../DB/index.js";

const router = express.Router();

router.get("/courses", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM courses");
    res.render("courses", {
      courses: result.rows,
      user: req.session.user || null,
      cartItems: req.session.cart ? req.session.cart.length : 0
    });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).send("Something went wrong");
  }
});

// Add search functionality
router.get("/courses/search", async (req, res) => {
  try {
    const searchQuery = req.query.query;
    
    if (!searchQuery) {
      return res.redirect('/courses');
    }
    
    // Search in course name and description using ILIKE for case-insensitive search
    const result = await pool.query(
      "SELECT * FROM courses WHERE name ILIKE $1 OR description ILIKE $1",
      [`%${searchQuery}%`]
    );
    
    // Process results
    
    res.render("search-results", {
      courses: result.rows,
      searchQuery,
      user: req.session.user || null,
      cartItems: req.session.cart ? req.session.cart.length : 0
    });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).send("Something went wrong with the search");
  }
});

export default router;
