import express from "express";
import pool from "../DB/index.js";

const router = express.Router();

router.get("/nodotadminpanel", async (req, res) => {
  if (req.session.isAdminAuthenticated) {
    try {
      // Fetch all users
      const userResult = await pool.query("SELECT * FROM users");

      // Fetch all courses
      const courseResult = await pool.query(
        "SELECT * FROM courses ORDER BY id DESC"
      );

      // Fetch all sections
      const sectionResult = await pool.query(
        "SELECT * FROM sections ORDER BY id DESC"
      );
      const promoCodeResult = await pool.query(
        "SELECT * FROM promo_codes ORDER BY id DESC"
      );

      const moduleResult = await pool.query(
        "SELECT * FROM modules ORDER BY id DESC"
      );

      const certificateResult = await pool.query(
        `SELECT certificates.id, certificates.email, courses.name AS course_name, certificates.certificate_code, certificates.issued_at, users.name AS user_name
         FROM certificates
         JOIN courses ON certificates.course_id = courses.id
         JOIN users ON certificates.user_id = users.id
         ORDER BY certificates.issued_at DESC`
      );

      const videoProgressResult = await pool.query(
        `SELECT video_progress.id, video_progress.email, modules.title AS module_title, video_progress.watched, users.name AS user_name
         FROM video_progress
         JOIN modules ON video_progress.module_id = modules.id
         JOIN users ON video_progress.email = users.email
         ORDER BY video_progress.id DESC`
      );

      // Fetch all purchases
      const purchaseResult = await pool.query(
        `SELECT purchases.id, purchases.email, courses.name AS course_name, purchases.purchased_at, users.name AS user_name
         FROM purchases
         JOIN courses ON purchases.course_id = courses.id
         JOIN users ON purchases.email = users.email
         ORDER BY purchases.purchased_at DESC`
      );
      const paymentHistoryResult = await pool.query(
        `SELECT id, email, payment_id, order_id, amount, status, payment_date 
         FROM payment_history 
         ORDER BY payment_date DESC`
      );

      // Render the admin panel and pass the data
      res.render("adminpanel", {
        users: userResult.rows,
        courses: courseResult.rows,
        sections: sectionResult.rows, // Pass sections to template
        promo_codes: promoCodeResult.rows,
        modules: moduleResult.rows,
        certificates: certificateResult.rows,
        video_progress: videoProgressResult.rows, // Pass video progress to template
        purchases: purchaseResult.rows, // Pass purchases to template
        payment_history: paymentHistoryResult.rows,
      });
    } catch (err) {
      console.error("Error fetching data:", err);
      res.status(500).send("Internal Server Error");
    }
  } else {
    res.redirect("/NODOTacademyADMIN");
  }
});

router.post("/deleteuser/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    const result = await pool.query("DELETE FROM users WHERE id=$1", [userId]);

    res.redirect("/nodotadminpanel");
  } catch (error) {
    console.log(error);
    res.send("db error");
  }
});

router.post("/add-course", (req, res) => {
  const {
    name,
    image_url,
    description,
    price,
    full_content,
    language,
    instructor,
    duration,
    vedio_duration,
  } = req.body;

  pool.query(
    `INSERT INTO courses (name, image_url, description, price, full_content, language, instructor, duration, vedio_duration)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      name,
      image_url,
      description,
      price,
      full_content,
      language,
      instructor,
      duration,
      vedio_duration,
    ],
    (err, result) => {
      if (err) {
        console.error("Error adding course:", err);
        return res.status(500).send("Error adding course");
      }

      res.redirect("/nodotadminpanel"); // Or redirect to another page
    }
  );
});

router.post("/deletecourse/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    const result = await pool.query("DELETE FROM courses WHERE id=$1", [
      userId,
    ]);

    res.redirect("/nodotadminpanel");
  } catch (error) {
    console.log(error);
    res.send("db error");
  }
});

router.post("/deletesection/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    const result = await pool.query("DELETE FROM sections WHERE id=$1", [
      userId,
    ]);

    res.redirect("/nodotadminpanel");
  } catch (error) {
    console.log(error);
    res.send("db error");
  }
});

router.post("/addsection", async (req, res) => {
  const { course_id, title } = req.body;

  try {
    // Insert the new section into the sections table
    const result = await pool.query(
      "INSERT INTO sections (course_id, title) VALUES ($1, $2) RETURNING *",
      [course_id, title]
    );

    // Redirect back to the admin panel or wherever you want to show the added section
    res.redirect("/nodotadminpanel"); // Adjust the redirect path as needed
  } catch (error) {
    console.error("Error adding section:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/addpromocode", async (req, res) => {
  const { code, price_offer } = req.body;

  try {
    // Insert the new promo code into the promo_codes table
    const result = await pool.query(
      "INSERT INTO promo_codes (code, price_offer) VALUES ($1, $2) RETURNING *",
      [code, price_offer]
    );

    // Redirect back to the admin panel or wherever you want to show the added promo codes
    res.redirect("/nodotadminpanel"); // Adjust the redirect path as needed
  } catch (error) {
    console.error("Error adding promo code:", error);
    res.status(500).send("Internal Server Error");
  }
});
router.post("/deletepromocode/:id", async (req, res) => {
  const promoCodeId = req.params.id;

  try {
    // Delete the promo code from the promo_codes table
    await pool.query("DELETE FROM promo_codes WHERE id=$1", [promoCodeId]);

    // Redirect back to the admin panel
    res.redirect("/nodotadminpanel");
  } catch (error) {
    console.error("Error deleting promo code:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Route to add a module
router.post("/addmodule", async (req, res) => {
  const { section_id, title, video_url, duration } = req.body;

  try {
    // Process video URL - keep as is if it's a HTTP URL, otherwise store as CloudFront path
    const processedVideoUrl = video_url.startsWith('http') 
      ? video_url  // Keep direct URLs as they are
      : video_url.trim();  // For CloudFront keys, just trim whitespace
    
    // Insert module data into the modules table
    await pool.query(
      "INSERT INTO modules (section_id, title, video_url, duration) VALUES ($1, $2, $3, $4)",
      [section_id, title, processedVideoUrl, duration]
    );

    res.redirect("/nodotadminpanel"); // Redirect back to the admin panel after adding
  } catch (error) {
    console.error("Error adding module:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Route to delete a module
router.post("/deletemodule/:id", async (req, res) => {
  const moduleId = req.params.id;

  try {
    // Delete the module from the database
    await pool.query("DELETE FROM modules WHERE id = $1", [moduleId]);

    res.redirect("/nodotadminpanel"); // Redirect back to the admin panel after deletion
  } catch (error) {
    console.error("Error deleting module:", error);
    res.status(500).send("Internal Server Error");
  }
});

// router.post("/addpromocode", async (req, res) => {
//   const { code, price_offer } = req.body;
//   const priceOfferNumber = parseFloat(price_offer);

//   try {
//     const result = await pool.query(
//       "INSERT INTO promo_codes (code, price_offer) VALUES ($1,$2)",
//       [code, priceOfferNumber]
//     );

//     res.redirect("/shadowdriftadminpanel");
//   } catch (err) {
//     console.log("error adding to db ", err);
//   }
// });

// router.post("/deletepromo_code/:id", async (req, res) => {
//   const Id = req.params.id;

//   try {
//     const result = await pool.query("DELETE FROM promo_codes WHERE id=$1", [
//       Id,
//     ]);

//     if (result.rowCount > 0) {
//       res.redirect("/shadowdriftadminpanel");
//     } else {
//       res.send("promo_code not found");
//     }
//   } catch (error) {
//     res.send("DB error");
//   }
// });

// router.post("/addproduct", async (req, res) => {
//   const {
//     name,
//     price,
//     imageurl,
//     img2,
//     img3,
//     img4,
//     category,
//     description,
//     sizes,
//   } = req.body;

//   console.log(req.body);
//   try {
//     const result = await pool.query(
//       "INSERT INTO products (name,price,imageurl,img2,img3,img4,category,description,sizes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
//       [name, price, imageurl, img2, img3, img4, category, description, sizes]
//     );

//     res.redirect("/shadowdriftadminpanel");
//   } catch (error) {
//     res.send("db error");
//   }
// });

// router.post("/approveorder/:id", async (req, res) => {
//   const id = req.params.id;

//   try {
//     const result = await pool.query(
//       "UPDATE orders SET status= $1 WHERE id=$2",
//       ["approved", id]
//     );

//     res.send("data updated");
//     // res.redirect('/shadowdriftadminpanel')
//   } catch (error) {
//     console.log(error);
//   }
// });

// router.post("/cancelorder/:id", async (req, res) => {
//   const id = req.params.id;

//   try {
//     const result = await pool.query("DELETE FROM orders WHERE id=$1", [id]);

//     const query = await pool.query(
//       "UPDATE cancel_order SET status = $1 WHERE id = $2",
//       ["completed", id]
//     );

//     res.redirect("/shadowdriftadminpanel");
//   } catch (error) {
//     console.log(error);
//   }
// });

export default router;
