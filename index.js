import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import homeRoute from "./Routes/homeRoute.js";
import loginRoute from "./Routes/loginRoute.js";
import signupRoute from "./Routes/signupRoute.js";
import cartRoute from "./Routes/cartRoute.js";
import profileRoute from "./Routes/profileRoute.js";

const app = express();
const port = 3000;

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

app.use("/", homeRoute);
app.use("/", loginRoute);
app.use("/", signupRoute);
app.use("/", cartRoute);
app.use("/", profileRoute);
app.use((req, res, next) => {
  res.status(404).render("404", { user: req.session.user || null });
  if (req.method === "POST") {
    console.log("Processing POST request:", req.path);
  }
  next();
});

app.listen(port, () => {
  console.log(`server is listening on port ${port}`);
});
