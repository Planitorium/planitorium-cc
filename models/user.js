const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: String,
  email: { type: String, required: true, unique: true },
  password: String,
  photo: String, 
});

module.exports = mongoose.model("User", userSchema);

// photo: { type: mongoose.Schema.Types.ObjectId, ref: 'fs.files' } 