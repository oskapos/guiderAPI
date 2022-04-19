const fs = require("fs");
const mongoose = require("mongoose");
const { validationResult } = require("express-validator");

const HttpError = require("../models/http-error");
const getCoordsForAddress = require("../util/location");
const Place = require("../models/place");
const User = require("../models/user");

exports.getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid; //getting the id from url params
  let place; //to scope it out of the try block
  try {
    //identifying the place through url id
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find a place.",
      500
    );
    return next(error);
  }

  if (!place) {
    const error = new HttpError( // => error handler
      "Could not find a place for the provided id.",
      404
    );
    return next(error);
  }
  //convert mongoose obj to a normal JS object but keep the 'id' property on it
  res.json({ place: place.toObject({ getters: true }) });
};

exports.getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid; //collecting userId from url
  // let places;
  let userWithPlaces;
  try {
    //'Place' is the Model
    //Accessing the places documents through their IDs with populate()
    userWithPlaces = await User.findById(userId).populate("places");
  } catch (err) {
    const error = new HttpError(
      "Fetching places failed, Please try again later",
      500
    );
    return next(error);
  }

  if (!userWithPlaces || userWithPlaces.places.length === 0) {
    return next(
      // => error handler middleware
      new HttpError("Could not find places for the provided user id.", 404)
    );
  }

  res.json({
    places: userWithPlaces.places.map((place) =>
      place.toObject({ getters: true })
    ),
  });
};

exports.createPlace = async (req, res, next) => {
  const errors = validationResult(req); // apply express-validator middlware we set up on the route
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  //extract data from request body
  const { title, description, address, creator } = req.body;

  //converting address to coordinates
  let coordinates = getCoordsForAddress(address);

  //creating a place from the Place Model
  const createdPlace = new Place({
    title,
    description,
    address,
    location: coordinates,
    image: req.file.path, //multer gives us this attribute on req
    creator,
  });

  //getting the place's creator
  let user;
  try {
    user = await User.findById(creator);
  } catch (err) {
    const error = new HttpError("Creating place failed, please try again", 500);
    return next(error);
  }
  //creator exists?
  if (!user) {
    const error = new HttpError("Could not find user for the provided id", 404);
    return next(error);
  }

  //Link the place to it's creator (user)
  try {
    //because we have multiple tasks connected we need to work with Sessions and Transactions
    const session = await mongoose.startSession();
    session.startTransaction();
    await createdPlace.save({ session });
    user.places.push(createdPlace); //add the place ID to the user (not a regular push)
    await user.save({ session });
    await session.commitTransaction(); //only after all tasks above succeed they will be commited
  } catch (err) {
    const error = new HttpError(
      "Creating place failed, please try again.",
      500
    );
    return next(error);
  }

  res.status(201).json({ place: createdPlace });
};

exports.updatePlace = async (req, res, next) => {
  const errors = validationResult(req); // apply express-validator middlware we set up on the route
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  //here we need data from the url AND ffrom the request body
  const { title, description } = req.body;
  const placeId = req.params.pid;

  //Identifying the place to be updated
  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update place.",
      500
    );
    return next(error);
  }

  //Authorization : the one editing is not the one who created the place
  if (place.creator.toString() !== req.userData.userId) {
    const error = new HttpError("You are not allowed to edit this place.", 401);
    return next(error);
  }

  //updating
  place.title = title;
  place.description = description;

  //Saving updates to the document on the DB
  try {
    await place.save();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update place.",
      500
    );
    return next(error);
  }

  res.status(200).json({ place: place.toObject({ getters: true }) });
};

exports.deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;

  //Identify place to be deleted
  let place;
  try {
    //'populate' allows to access the data referred to by the id in 'creator', so the linked user document
    //but ofcourse a relation should've been setup between the respective Models first
    place = await Place.findById(placeId).populate("creator");
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete place.",
      500
    );
    return next(error);
  }

  if (!place) {
    const error = new HttpError("Could not find a place for this id.", 404);
    return next(error);
  }

  //Authorization : the one deleting is not the one who created the place
  if (place.creator.id !== req.userData.userId) {
    const error = new HttpError(
      "You are not allowed to delete this place.",
      401
    );
    return next(error);
  }

  const imagePath = place.image;

  //Delete the place from DB
  try {
    const session = await mongoose.startSession();
    //Multiple connected tasks => Session & Transaction
    session.startTransaction();
    await place.remove({ session: session });
    //we can access the entire 'user' document thanks to populate() we used above
    place.creator.places.pull(place); //'pull' will remove the place id from the linked user doc
    await place.creator.save({ session: session });
    await session.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete place.",
      500
    );
    return next(error);
  }

  //delete image from file system
  fs.unlink(imagePath, (err) => {
    console.log(err);
  });

  res.status(200).json({ message: "Deleted Place." });
};
