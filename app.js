const fs = require("fs");
const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");

const placesRoutes = require("./routes/places-routes");
const usersRoutes = require("./routes/users-routes");
const HttpError = require("./models/http-error");

const app = express().use("*", cors());

//parse the request body so we can read data there
app.use(bodyParser.json());

//static serving (return a file)
app.use("/uploads/images", express.static(path.join("uploads", "images")));

//Mounting Routes
app.use("/api/places", placesRoutes);
app.use("/api/users", usersRoutes);

//Handling unsupported routes
app.use((req, res, next) => {
  const error = new HttpError("Could not find this route.", 404);
  throw error;
});

// The Error Handling Middleware
app.use((error, req, res, next) => {
  if (req.file) {
    //rollback uploaded file
    fs.unlink(req.file.path, (err) => {
      console.log(err);
    });
  }

  if (res.headerSent) {
    //response already has been sent
    return next(error);
  }
  res.status(error.code || 500);
  res.json({ message: error.message || "An unknown error occured!" });
});

//Connecting to the Database
mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.tad8k.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`
  )
  .then(() => {
    //running the server
    app.listen(process.env.PORT || 5000);
    console.log("Connected To DB.");
  })
  .catch((err) => console.log(err));
