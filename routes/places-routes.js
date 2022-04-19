const express = require("express");
const { check } = require("express-validator");

const placesController = require("../controllers/places-controller");
const fileUpload = require("../middleware/file-upload");
const checkAuth = require("../middleware/check-auth");

const HttpError = require("../models/http-error");

const router = express.Router();

//Route: api/places/placeId1
router.get("/:pid", placesController.getPlaceById);

//Route: api/places/user/userId1
router.get("/user/:uid", placesController.getPlacesByUserId);

//Authentication middleware
router.use(checkAuth);

router.post(
  "/",
  fileUpload.single("image"), //apply 'multer' file upload middleware
  [
    //validating user input using 'express-validator'
    check("title").not().isEmpty(),
    check("description").isLength({ min: 5 }),
    check("address").not().isEmpty(),
  ],
  placesController.createPlace
);

router.patch(
  "/:pid",
  [check("title").not().isEmpty(), check("description").isLength({ min: 5 })],
  placesController.updatePlace
);

router.delete("/:pid", placesController.deletePlace);

module.exports = router;
