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
  const userEmail = req.session.email;

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

  let hasPurchased = false;

  if (userEmail) {
    const purchaseCheck = await pool.query(
      "SELECT * FROM purchases WHERE email = $1 AND course_id = $2",
      [userEmail, courseId]
    );
    hasPurchased = purchaseCheck.rows.length > 0;
  }

  res.render("course-details", {
    course,
    sections,
    user: req.session.user || null,
    userEmail,
    hasPurchased,
  });
});

router.get("/mylearning", async (req, res) => {
  if (!req.session.isAuthenticated) {
    return res.redirect("/login");
  }

  try {
    const email = req.session.user.email;

    const result = await pool.query(
      `
      SELECT 
        c.*, 
        COUNT(DISTINCT m.id) AS total_modules,
        COUNT(DISTINCT vp.module_id) AS completed_modules
      FROM purchases p
      JOIN courses c ON p.course_id = c.id
      LEFT JOIN sections s ON s.course_id = c.id
      LEFT JOIN modules m ON m.section_id = s.id
      LEFT JOIN video_progress vp 
        ON vp.module_id = m.id AND vp.email = $1 AND vp.watched = true
      WHERE p.email = $1
      GROUP BY c.id
      `,
      [email]
    );

    const courses = result.rows.map((course) => {
      const progress =
        course.total_modules > 0
          ? Math.round((course.completed_modules / course.total_modules) * 100)
          : 0;
      return {
        ...course,
        progress,
      };
    });

    res.render("mylearning", {
      user: req.session.user,
      courses,
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
