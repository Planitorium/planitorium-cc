const mongoose = require("mongoose");

// Schema untuk menyimpan informasi tentang deteksi tanaman
const detectionSchema = new mongoose.Schema({
  plantName: { type: String, required: true },
  result: { type: String, required: true },
  photo: { type: String },
  dateTime: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Detection", detectionSchema);