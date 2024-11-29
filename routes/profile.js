const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth");  // Memastikan verifyToken diimport
const User = require("../models/user");
const multer = require("multer");

// Konfigurasi Multer untuk upload file
const upload = multer({ dest: "uploads/" });

// Endpoint untuk mendapatkan profil pengguna
router.get("/", verifyToken, async (req, res) => {
  // Jika pengguna terautentikasi, tampilkan informasi profil
  try {
    const user = await User.findOne({ email: req.user.email }).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });

    res.status(200).json({
      message: "Welcome to your profile!",
      profile: {
        username: user.username,
        email: user.email,
        photo: user.photo || "No photo uploaded yet",
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Endpoint untuk meng-upload foto (terlindungi dengan token)
router.post("/upload", verifyToken, upload.single("photo"), async (req, res) => {
  // Jika tidak ada pengguna terautentikasi, kembalikan error
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized, please log in first" });
  }

  try {
    // Menyimpan path foto di database
    const user = await User.findOneAndUpdate(
      { email: req.user.email },
      { photo: req.file.path }, // Path file foto yang diupload
      { new: true }
    );

    res.status(200).json({
      message: "Photo uploaded successfully",
      photo: user.photo,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to upload photo" });
  }
});

// Logout Endpoint
router.post("/logout", verifyToken, (req, res) => {
    // The token is removed on the client-side, so the server doesn't need to do anything except acknowledge the request.
    res.status(200).json({
      message: "Successfully logged out. Please remove your token from storage.",
    });
  });

module.exports = router;


// const express = require('express');
// const multer = require('multer');
// const { GridFsStorage } = require('multer-gridfs-storage');
// const mongoose = require('mongoose');
// const User = require('../models/user');
// const jwt = require('jsonwebtoken');
// const router = express.Router();

// // Konfigurasi storage GridFS
// const storage = new GridFsStorage({
//   url: process.env.MONGO_URI,  // Gantilah dengan URI MongoDB Anda
//   file: (req, file) => {
//     return {
//       bucketName: "photos",  // Menyimpan file dalam bucket 'photos'
//       filename: Date.now() + file.originalname, // Membuat nama file unik
//     };
//   }
// });

// const upload = multer({ storage });

// // Middleware untuk verifikasi token JWT
// const verifyToken = (req, res, next) => {
//   const token = req.headers["authorization"];
//   if (!token) {
//     return res.status(401).json({ error: "Unauthorized" });
//   }

//   // Menghapus kata "Bearer" dari token
//   const tokenWithoutBearer = token.split(" ")[1];

//   jwt.verify(tokenWithoutBearer, process.env.JWT_SECRET, (err, decoded) => {
//     if (err) {
//       return res.status(401).json({ error: "Unauthorized" });
//     }
//     req.user = decoded;  // Menyimpan informasi pengguna dari token
//     next();
//   });
// };

// // Route untuk upload foto profil
// router.post('/upload', verifyToken, upload.single('photo'), async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ error: "No file uploaded" });
//     }

//     // Menyimpan referensi ID file yang di-upload di model User
//     const user = await User.findById(req.user._id);
//     user.photo = req.file.id;  // Menyimpan ID foto dalam User
//     await user.save();

//     res.status(200).json({ message: "Profile photo uploaded successfully", photoId: req.file.id });
//   } catch (error) {
//     console.error("Error uploading file:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

// module.exports = router;
