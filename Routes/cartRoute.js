import express from "express";
import pool from "../DB/index.js";

const router = express.Router();

let cart = [];

// GET cart page
router.get("/cart", (req, res) => {
  res.render("cart", { cart, user: req.session.user || null });
});

// ADD to cart
router.post("/add-to-cart", (req, res) => {
  const { id, name, price, image } = req.body;

  // Avoid duplicates (optional)
  const exists = cart.find((item) => item.id === id);
  if (!exists) {
    const courseItem = { id, name, price, image };
    cart.push(courseItem);
  }

  res.redirect("/cart"); // redirect to cart page after adding
});

// ✅ REMOVE from cart
router.post("/remove-from-cart", (req, res) => {
  const { id } = req.body;

  // Remove the course by filtering it out
  cart = cart.filter((item) => item.id !== id);

  res.redirect("/cart"); // redirect to updated cart page
});

router.post("/checkout", async (req, res) => {
  const email = "student@email.com"; // Replace with session/email if available

  try {
    for (const course of cart) {
      await pool.query(
        "INSERT INTO purchases (email, course_id) VALUES ($1, $2)",
        [email, course.id]
      );
    }

    cart = []; // Clear cart after successful purchase
    res.send("🎉 Courses purchased successfully!");
  } catch (err) {
    console.error("Checkout error:", err);
    res.status(500).send("Something went wrong.");
  }
});

export default router;
