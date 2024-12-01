const mongoose = require('mongoose');

// Schema untuk menyimpan informasi tentang tanaman
const plantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String},
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  photo: { type: String }, 
});

module.exports = mongoose.model('Plant', plantSchema);