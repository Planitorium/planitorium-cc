// const express = require("express");
// const router = express.Router();
// const { optionalVerifyToken } = require("../middlewares/auth");
// const User = require("../models/user");
// const multer = require("multer");

// // Konfigurasi Multer untuk upload foto
// const upload = multer({ dest: "uploads/" });

// // Root endpoint
// router.get("/", optionalVerifyToken, async (req, res) => {
//   if (!req.user) {
//     // Jika belum login
//     return res.status(200).json({
//       message: "Hello World! You're using our Capstone API!",
//     });
//   }

//   // Jika sudah login, tampilkan detail profil pengguna
//   try {
//     const user = await User.findOne({ email: req.user.email }).select("-password");
//     if (!user) return res.status(404).json({ error: "User not found" });

//     res.status(200).json({
//       message: "Welcome to your profile!",
//       profile: {
//         username: user.username,
//         email: user.email,
//         photo: user.photo || "No photo uploaded yet",
//       },
//     });
//   } catch (error) {
//     res.status(500).json({ error: "Failed to fetch profile" });
//   }
// });

// // Endpoint upload photo
// router.post("/upload", optionalVerifyToken, upload.single("photo"), async (req, res) => {
//   if (!req.user) {
//     return res.status(401).json({ error: "Unauthorized, please log in first" });
//   }

//   try {
//     const user = await User.findOneAndUpdate(
//       { email: req.user.email },
//       { photo: req.file.path }, // Simpan path foto di database
//       { new: true }
//     );

//     res.status(200).json({
//       message: "Photo uploaded successfully",
//       photo: user.photo,
//     });
//   } catch (error) {
//     res.status(500).json({ error: "Failed to upload photo" });
//   }
// });

// // Endpoint logout
// router.post("/logout", optionalVerifyToken, (req, res) => {
//   if (!req.user) {
//     return res.status(401).json({ error: "Unauthorized, you are not logged in" });
//   }

//   // Tidak ada langkah teknis logout di backend untuk JWT
//   res.status(200).json({
//     message: "Successfully logged out",
//     tip: "Simply remove the token from your local storage or cookies.",
//   });
// });

// module.exports = router;

const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth");  // Change to verifyToken to enforce authentication
const User = require("../models/user");
const multer = require("multer");

// Configure Multer for file upload
const upload = multer({ dest: "uploads/" });

// Root endpoint - now fully protected
router.get("/", verifyToken, async (req, res) => {  // Changed to verifyToken
  // If the user is authenticated, show profile information
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

// Endpoint for uploading photo - fully protected
router.post("/upload", verifyToken, upload.single("photo"), async (req, res) => {  // Changed to verifyToken
  // If not authenticated, return an error
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized, please log in first" });
  }

  try {
    const user = await User.findOneAndUpdate(
      { email: req.user.email },
      { photo: req.file.path }, // Save photo path in database
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

// Logout endpoint - still needs token check to ensure user is logged in
router.post("/logout", verifyToken, (req, res) => {  // Changed to verifyToken
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized, you are not logged in" });
  }

  // No specific logout logic for JWT
  res.status(200).json({
    message: "Successfully logged out",
    tip: "Simply remove the token from your local storage or cookies.",
  });
});

module.exports = router;
