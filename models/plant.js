const mongoose = require('mongoose');

const plantSchema = new mongoose.Schema({
  plantName: { type: String, required: true },
  description: { type: String },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  photo: { type: String }, // URL atau path file foto
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // Relasi ke pengguna
});

module.exports = mongoose.model('Plant', plantSchema);
