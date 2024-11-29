const mongoose = require("mongoose");

const detectionSchema = new mongoose.Schema({
  photo: String, // URL atau base64 string dari foto yang diunggah
  result: String, // Hasil deteksi (nama tanaman, dsb.)
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Referensi ke user
  detectedAt: { type: Date, default: Date.now }, // Waktu deteksi
});

module.exports = mongoose.model("Detection", detectionSchema);
