import express from "express";

const router = express.Router();

router.get("/aboutus", (req, res) => {
  res.render("about", { user: req.session.user || null });
});

export default router;
