import express from "express";

const app = express();
const port = 3000;

app.use("view engine", "ejs");

app.listen(port, () => {
  console.log(`server is listening on port ${port}`);
});
