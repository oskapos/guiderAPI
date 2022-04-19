const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const HttpError = require("../models/http-error");
const User = require("../models/user");

exports.getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password"); //exlude 'password' from result
  } catch (err) {
    const error = new HttpError(
      "Fetching users failed, please try again later.",
      500
    );
    return next(error);
  }

  res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};

exports.signup = async (req, res, next) => {
  // apply express-validator middlware we set up on the route
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  //extract data from body
  const { name, email, password } = req.body;

  //Get user with email
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      "signing up failed, Please try again later.",
      500
    );
    return next(error);
  }
  //User exists already?
  if (existingUser) {
    const error = new HttpError(
      "User exists already, Please login instead",
      422
    );
    return next(error);
  }

  //Hashing the password with bcrypt
  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError(
      "Could not create user, please try again.",
      500
    );
    return next(error);
  }

  //Creating the user from the User Model
  const createdUser = new User({
    name,
    email,
    image: req.file.path, //provided by multer
    password: hashedPassword,
    places: [],
  });

  //Persisting user to DB
  try {
    await createdUser.save();
  } catch (err) {
    const error = new HttpError("Signing up failed, please try again.", 500);
    return next(error);
  }

  //Generating a Token
  let token;
  try {
    token = jwt.sign(
      { userId: createdUser.id, email: createdUser.email },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    const error = new HttpError("Signing up failed, please try again.", 500);
    return next(error);
  }

  //the response containing the token
  res
    .status(201)
    .json({ userId: createdUser.id, email: createdUser.email, token });
};

exports.login = async (req, res, next) => {
  //extract data from body
  const { email, password } = req.body;

  //get the user based on email
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      "Logging in failed, Please try again later.",
      500
    );
    return next(error);
  }

  //there is no such email
  if (!existingUser) {
    const error = new HttpError(
      "Invalid credentials, could not log you in",
      401
    );
    return next(error);
  }

  //Validating Password
  let isValidPassword = false;
  try {
    //string password from frontend ?= hashed password in DB
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    const error = new HttpError(
      "Could not log you in, please check your credentials and try again.",
      500
    );
    return next(error);
  }

  //password is wrong
  if (!isValidPassword) {
    const error = new HttpError(
      "Invalid credentials, could not log you in",
      403
    );
    return next(error);
  }

  //Generating a Token
  let token;
  try {
    token = jwt.sign(
      { userId: existingUser.id, email: existingUser.email },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    const error = new HttpError("Logging in failed, please try again.", 500);
    return next(error);
  }

  //the response containing the token
  res.json({
    userId: existingUser.id,
    email: existingUser.email,
    token,
  });
};
