import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables at the very beginning
dotenv.config();
console.log("Environment loaded, NODE_ENV:", process.env.NODE_ENV);

import homeRoute from "./Routes/homeRoute.js";
import loginRoute from "./Routes/loginRoute.js";
import signupRoute from "./Routes/signupRoute.js";
import cartRoute from "./Routes/cartRoute.js";
import courseRoute from "./Routes/courseRoute.js";
import profileRoute from "./Routes/profileRoute.js";
import aboutusRoute from "./Routes/aboutusRoute.js";
import adminpanelRoute from "./Routes/adminpanelRout.js";
import adminloginRoute from "./Routes/adminloginRoute.js";
import videoRoute from "./Routes/videoRoute.js";
import {
  checkAuthenticated,
  checkAdminAuthenticated,
} from "./middleware/authmiddleware.js";

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 4000;

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // This parses incoming JSON requests

app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Set to true in production if using HTTPS
  })
);

const allowedOrigins = [
  "http://localhost:4000", 
  "https://localhost:4000",
  "http://academy.nodot.in",
  "https://academy.nodot.in"
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Check if origin contains CloudFront domain
      if (origin.includes('cloudfront.net')) {
        return callback(null, true);
      }
      
      // Default deny
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
  })
);

// Add special handler for video files
app.use((req, res, next) => {
  // Check if this is a video file request
  if (req.path.match(/\.(mp4|webm|ogg|m4v)$/i)) {
    // Set CORS headers for video files
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Range');
    res.header('Access-Control-Expose-Headers', 'Content-Length, Accept-Ranges, Content-Range');
    
    // If preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
  }
  next();
});

// SEO Enhancements
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.sendFile(path.join(__dirname, 'public/robots.txt'));
});

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  res.sendFile(path.join(__dirname, 'public/sitemap.xml'));
});

// Route for favicon
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/favicon/favicon.ico'));
});

app.use("/", homeRoute);
app.use("/", loginRoute);
app.use("/", signupRoute);
app.use("/", cartRoute);
app.use("/", courseRoute);
app.use("/", aboutusRoute);
app.use("/", profileRoute);
app.use("/", videoRoute);
app.use("/", checkAdminAuthenticated, adminpanelRoute);
app.use("/", adminloginRoute);

// Error handling middleware - add this at the end of all route definitions
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  console.error('Error Stack:', err.stack);
  
  // Send an appropriate error response
  res.status(500).send({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler - should be the last middleware
app.use((req, res) => {
  console.log('404 Not Found:', req.method, req.originalUrl);
  res.status(404).render('404', { title: 'Page Not Found', user: req.session.user || null });
});

// Schedule sitemap generation once a day
if (process.env.NODE_ENV === 'production') {
  // Import and use the sitemap generator in production
  import('./scripts/generate-sitemap.js').then((sitemapModule) => {
    // Generate sitemap immediately on startup
    sitemapModule.generateSitemap();
    
    // Then schedule to run daily at midnight
    setInterval(() => {
      sitemapModule.generateSitemap();
    }, 24 * 60 * 60 * 1000);
  }).catch(err => {
    console.error('Failed to load sitemap generator:', err);
  });
}

app.listen(port, () => {
  console.log(`server is listening on port ${port}`);
});
