import express from "express";
import pool from "../DB/index.js";
import Razorpay from "razorpay"; // Import Razorpay
import crypto from "crypto"; // To verify the payment signature
import dotenv from "dotenv";

const router = express.Router();

dotenv.config();

// Initialize Razorpay configuration

// Use fallback values if environment variables are not set
const key_id = process.env.RAZORPAY_KEY_ID || "rzp_test_YOUR_TEST_KEY_ID";
const key_secret = process.env.RAZORPAY_KEY_SECRET || "YOUR_TEST_KEY_SECRET";

const razorpay = new Razorpay({
  key_id: key_id,
  key_secret: key_secret
});

let cart = [];

// Function to calculate total without subtotal and delivery charge
function calculateCartTotal(cart) {
  // Calculate total by summing up the price of all items in the cart
  const total = cart.reduce((sum, item) => sum + item.price, 0);
  return { total };
}

// GET cart page
router.get("/cart", (req, res) => {
  const { total } = calculateCartTotal(cart);
  res.render("cart", {
    cart,
    total: total ? total.toFixed(2) : "0.00", // Ensure total is a number and call toFixed
    user: req.session.user || null,
  });
});

// ADD to cart
router.post("/add-to-cart", (req, res) => {
  const { id, name, price, image } = req.body;

  // Avoid duplicates (optional)
  const exists = cart.find((item) => item.id === id);
  if (!exists) {
    const courseItem = { id, name, price: parseFloat(price), image }; // Ensure price is a number
    cart.push(courseItem);
  }

  // Calculate the total after adding the item
  const { total } = calculateCartTotal(cart);

  res.redirect("/cart"); // redirect to cart page after adding
});

// ✅ REMOVE from cart
router.post("/remove-from-cart", (req, res) => {
  const { id } = req.body;

  // Remove the course by filtering it out
  cart = cart.filter((item) => item.id !== id);

  // Calculate the total after removing the item
  const { total } = calculateCartTotal(cart);

  res.redirect("/cart"); // redirect to updated cart page
});

router.post("/promo-code", async (req, res) => {
  const { code } = req.body; // Get the promo code from the request

  try {
    // Query the database to check if the promo code exists and is valid
    const promoQuery = await pool.query(
      "SELECT * FROM promo_codes WHERE code = $1",
      [code]
    );

    let discount = 0; // Initialize discount variable
    
    if (promoQuery.rows.length > 0) {
      // Promo code is valid, get the price offer
      discount = parseFloat(promoQuery.rows[0].price_offer); // Use price_offer column

      if (isNaN(discount) || discount <= 0) {
        discount = 0; // Invalid discount value, set to 0
      }

      // Recalculate the total without any discount
      const { total } = calculateCartTotal(cart);
      let discountedTotal = total;

      // Apply discount if it's valid
      if (discount > 0) {
        // Assuming the discount is a fixed amount (e.g., ₹50.00 off)
        discountedTotal = total - discount;
      }

      // Ensure total does not go below 0
      discountedTotal = Math.max(discountedTotal, 0);

      // Render the cart with the success message and the updated total
      res.render("cart", {
        cart,
        total: discountedTotal ? discountedTotal.toFixed(2) : "0.00", // Show updated total
        user: req.session.user || null,
        successMessage: `Promo code applied! You get ₹${discount.toFixed(
          2
        )} off.`,
        errorMessage: "", // No error message
      });
    } else {
      // Invalid promo code
      const { total } = calculateCartTotal(cart);

      // Render the cart with the error message and original total
      res.render("cart", {
        cart,
        total: total.toFixed(2), // Show original total
        user: req.session.user || null,
        successMessage: "", // No success message
        errorMessage: "Invalid promo code. Please try again.", // Error message
      });
    }
  } catch (err) {
    console.error("Error applying promo code:", err);
    res.status(500).send("Server error");
  }
});

// Checkout Route
router.post("/checkout", async (req, res) => {
  const { total } = req.body;

  if (!req.session.isAuthenticated) {
    return res.redirect("/login");
  }

  // Here, we won't insert into the database yet
  try {
    // Create a Razorpay order
    const orderOptions = {
      amount: total * 100, // Convert total to paise
      currency: "INR",
      receipt: `order_${new Date().getTime()}`, // Generate a unique receipt ID
      payment_capture: 1, // Auto capture the payment
    };

    // Razorpay order creation
    razorpay.orders.create(orderOptions, (err, order) => {
      if (err) {
        console.error("Error creating Razorpay order:", err);
        return res.status(500).send("Something went wrong.");
      }

      // Send the order details to the frontend
      res.render("payment", {
        orderId: order.id,
        amount: total,
        key_id: razorpay.key_id, // Pass Razorpay Key ID to the frontend
      });
    });
  } catch (err) {
    console.error("Checkout error:", err);
    res.status(500).send("Something went wrong.");
  }
});

// Process Payment Route (POST request)
router.post("/process-payment", async (req, res) => {
  const { payment_id, order_id, signature } = req.body;

  const body = order_id + "|" + payment_id; // Prepare body for signature verification

  // Verify the signature sent by Razorpay with your own
  const generated_signature = crypto
    .createHmac("sha256", razorpay.key_secret)
    .update(body)
    .digest("hex");

  // Check if the signatures match
  if (generated_signature === signature) {
    try {
      // Now that the payment is successful, insert into the database
      const { total } = req.body;
      const email = req.session.email; // Get email from session or request

      await pool.query(
        "INSERT INTO payment_history (email, payment_id, order_id, amount, status) VALUES ($1, $2, $3, $4, $5)",
        [email, payment_id, order_id, total, "success"]
      );

      // Insert purchased courses into the database (example)
      for (const course of cart) {
        await pool.query(
          "INSERT INTO purchases (email, course_id) VALUES ($1, $2)",
          [email, course.id]
        );
      }

      cart = []; // Clear the cart after successful purchase

      // Respond with a success message
      res.json({ status: "success" });
    } catch (err) {
      console.error("Payment processing error:", err);
      res.json({ status: "failure" });
    }
  } else {
    console.log("Signature mismatch");
    res.json({ status: "failure" });
  }
});

export default router;
