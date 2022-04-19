//ERROR MODEL to produce custom errors to feed to the error handler

class HttpError extends Error {
  constructor(message, errorCode) {
    super(message); //Forward the 'message' value
    this.code = errorCode; //Adds a 'code' property
  }
}

module.exports = HttpError;
