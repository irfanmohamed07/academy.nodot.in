import express from "express";
import pool from "../DB/index.js";

const router = express.Router();

router.get("/learn/:id", async (req, res) => {
  if (!req.session.isAuthenticated) {
    return res.redirect("/login");
  }

  const courseId = req.params.id;
  const userEmail = req.session.email; // assuming this is set during login

  try {
    const purchaseCheck = await pool.query(
      "SELECT * FROM purchases WHERE email = $1 AND course_id = $2",
      [userEmail, courseId]
    );

    if (purchaseCheck.rows.length === 0) {
      return res.redirect("/");
    }

    const courseResult = await pool.query(
      "SELECT * FROM courses WHERE id = $1",
      [courseId]
    );

    const sectionsResult = await pool.query(
      "SELECT * FROM sections WHERE course_id = $1",
      [courseId]
    );

    const sectionIds = sectionsResult.rows.map((s) => s.id);

    const modulesResult = await pool.query(
      "SELECT * FROM modules WHERE section_id = ANY($1::int[])",
      [sectionIds]
    );

    // ✅ Get watched module_ids
    const watchedResult = await pool.query(
      "SELECT module_id FROM video_progress WHERE email = $1 AND watched = true",
      [userEmail]
    );

    const watchedModules = watchedResult.rows.map((r) => r.module_id);

    const sectionsWithModules = sectionsResult.rows.map((section) => {
      return {
        ...section,
        modules: modulesResult.rows.filter(
          (module) => module.section_id === section.id
        ),
      };
    });

    res.render("course-watch", {
      user: req.session.user || null,
      course: courseResult.rows[0],
      sections: sectionsWithModules,
      watchedModules, // ✅ Pass watched modules to EJS
    });
  } catch (err) {
    console.error(err);
    res.send("Error loading course.");
  }
});

router.post("/update-video-progress", async (req, res) => {
  try {
    const { email, module_id, watched } = req.body;
    console.log(req.body);

    const result = await pool.query(
      "SELECT * FROM video_progress WHERE email = $1 AND module_id = $2",
      [email, module_id]
    );

    if (result.rows.length > 0) {
      await pool.query(
        "UPDATE video_progress SET watched = $1 WHERE email = $2 AND module_id = $3",
        [watched, email, module_id]
      );
    } else {
      await pool.query(
        "INSERT INTO video_progress (email, module_id, watched) VALUES ($1, $2, $3)",
        [email, module_id, watched]
      );
    }

    res.json({ success: true, message: "Progress saved" });
  } catch (error) {
    console.error("Error updating progress:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
