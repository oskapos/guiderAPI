const HttpError = require("../models/http-error");
const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  //skip (allow) options requests
  if (req.method === "OPTIONS") {
    return next();
  }
  try {
    //extract token from request headers
    const token = req.headers.authorization.split(" ")[1]; //Authorization: 'Bearer TOKEN'
    if (!token) {
      throw new Error("Authentication failed!");
    }
    //token legit?
    const decodedToken = jwt.verify(token, process.env.JWT_KEY);
    //attaching userId extracted from mtoken to the request so later middlewares can use it
    req.userData = { userId: decodedToken.userId };
    next();
  } catch (er) {
    const error = new HttpError("Authentication failed!", 403);
    return next(error);
  }
};
