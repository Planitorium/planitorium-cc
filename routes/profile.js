const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Grid = require("gridfs-stream");
const path = require("path");
const { verifyToken } = require("../middlewares/auth");
const User = require("../models/user");

const router = express.Router();

// Inisialisasi GridFS
let gfs, gridfsBucket;

mongoose.connection.once("open", () => {
  gridfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "uploads",
  });
  gfs = Grid(mongoose.connection.db, mongoose.mongo);
  gfs.collection("uploads");
});

// Konfigurasi Multer untuk menyimpan file di memory buffer
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Endpoint untuk mendapatkan profil pengguna
router.get("/", verifyToken, async (req, res) => {
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
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Endpoint untuk meng-upload foto ke MongoDB
router.post("/upload", verifyToken, upload.single("photo"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const filename = `${crypto.randomBytes(16).toString("hex")}${path.extname(req.file.originalname)}`;

  const writeStream = gridfsBucket.openUploadStream(filename, {
    contentType: req.file.mimetype,
  });

  // Tulis buffer dan tunggu proses selesai
  writeStream.end(req.file.buffer, async (err) => {
    if (err) {
      console.error("Error writing to GridFSBucket:", err);
      return res.status(500).json({ error: "Failed to upload photo" });
    }

    // Setelah selesai, dapatkan detail file
    try {
      const files = await gfs.files.findOne({ filename: filename });
      if (!files) {
        console.error("File saved but not found in database");
        return res.status(500).json({ error: "File upload incomplete" });
      }

      // Update profil pengguna dengan nama file
      const user = await User.findOneAndUpdate(
        { email: req.user.email },
        { photo: filename },
        { new: true }
      );

      if (!user) return res.status(404).json({ error: "User not found" });

      res.status(200).json({
        message: "Photo uploaded successfully",
        photo: filename,
      });
    } catch (error) {
      console.error("Error fetching or updating user photo:", error);
      res.status(500).json({ error: "Failed to update user photo" });
    }
  });

  writeStream.on("error", (err) => {
    console.error("Error uploading photo:", err);
    res.status(500).json({ error: "Failed to upload photo" });
  });
});



// Endpoint untuk mengambil foto berdasarkan filename
router.get("/photo/:filename", async (req, res) => {
  try {
    const file = await gfs.files.findOne({ filename: req.params.filename });
    if (!file) return res.status(404).json({ error: "File not found" });

    const readStream = gridfsBucket.openDownloadStreamByName(file.filename);
    res.set("Content-Type", file.contentType);
    readStream.pipe(res);
  } catch (error) {
    console.error("Error fetching photo:", error);
    res.status(500).json({ error: "Failed to fetch photo" });
  }
});

module.exports = router;