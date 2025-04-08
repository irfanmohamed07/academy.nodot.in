import express from "express";
import pool from "../DB/index.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM courses");
    res.render("index", {
      courses: result.rows,
      user: req.session.user || null,
    });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).send("Something went wrong");
  }
});

router.get("/course/:id", async (req, res) => {
  const courseId = req.params.id;

  const courseQuery = await pool.query("SELECT * FROM courses WHERE id = $1", [
    courseId,
  ]);
  const course = courseQuery.rows[0];

  const sectionsQuery = await pool.query(
    "SELECT * FROM sections WHERE course_id = $1",
    [courseId]
  );
  const sections = await Promise.all(
    sectionsQuery.rows.map(async (section) => {
      const modulesQuery = await pool.query(
        "SELECT * FROM modules WHERE section_id = $1",
        [section.id]
      );
      section.modules = modulesQuery.rows;
      return section;
    })
  );

  res.render("course-details", { course, sections });
});

router.get("/mylearning", async (req, res) => {
  if (!req.session.isAuthenticated) {
    return res.redirect("/login");
  }

  try {
    const userId = req.session.user.id;
    const result = await pool.query(
      `SELECT courses.* 
       FROM purchases 
       JOIN courses ON purchases.course_id = courses.id 
       WHERE purchases.email = $1`,
      [req.session.user.email]
    );

    res.render("mylearning", {
      user: req.session.user,
      courses: result.rows,
    });
  } catch (err) {
    console.error("Error loading my learning:", err);
    res.render("mylearning", {
      user: req.session.user,
      courses: [],
      error: "Something went wrong.",
    });
  }
});

export default router;
