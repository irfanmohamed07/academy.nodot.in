import express from "express";
import pool from "../DB/index.js";

const router = express.Router();

router.get("/learn/:id", async (req, res) => {
  if (!req.session.isAuthenticated) {
    return res.redirect("/login");
  }
  const courseId = req.params.id;
  const userEmail = req.session.email; // assuming you're storing email in session
  console.log(courseId, userEmail);

  try {
    // ✅ Check if user purchased this course
    const purchaseCheck = await pool.query(
      "SELECT * FROM purchases WHERE email = $1 AND course_id = $2",
      [userEmail, courseId]
    );

    if (purchaseCheck.rows.length === 0) {
      return res.send("You have not purchased this course."); // or redirect to purchase page
    }

    // ✅ Fetch the course
    const courseResult = await pool.query(
      "SELECT * FROM courses WHERE id = $1",
      [courseId]
    );

    // ✅ Fetch all sections for the course
    const sectionsResult = await pool.query(
      "SELECT * FROM sections WHERE course_id = $1",
      [courseId]
    );

    const sectionIds = sectionsResult.rows.map((s) => s.id);

    // ✅ Fetch modules under those sections
    const modulesResult = await pool.query(
      "SELECT * FROM modules WHERE section_id = ANY($1::int[])",
      [sectionIds]
    );

    // ✅ Merge sections with their modules
    const sectionsWithModules = sectionsResult.rows.map((section) => {
      return {
        ...section,
        modules: modulesResult.rows.filter(
          (module) => module.section_id === section.id
        ),
      };
    });

    res.render("course-watch", {
      course: courseResult.rows[0],
      sections: sectionsWithModules,
    });
  } catch (err) {
    console.error(err);
    res.send("Error loading course.");
  }
});

export default router;
