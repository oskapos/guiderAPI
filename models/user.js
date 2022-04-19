const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const Schema = mongoose.Schema;

//The User Schema
const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true }, //'unique' creates an index
  password: { type: String, required: true, minlength: 6 },
  image: { type: String, required: true },
  //creating a Relation with 'Place' model, auser can have multiple places so => Array
  places: [{ type: mongoose.Types.ObjectId, required: true, ref: "Place" }],
});

//will work with the 'unique' property on email and make sure it's always unique
userSchema.plugin(uniqueValidator);

module.exports = mongoose.model("User", userSchema);
