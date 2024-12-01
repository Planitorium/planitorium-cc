// models/Blacklist.js
const mongoose = require('mongoose');

// Definisikan skema untuk Blacklist
const blacklistSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
  },
});

// Membuat model Blacklist berdasarkan skema
const Blacklist = mongoose.model('Blacklist', blacklistSchema);

// Mengekspor model agar bisa digunakan di file lain
module.exports = Blacklist;
