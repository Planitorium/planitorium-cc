const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Grid = require("gridfs-stream");
const path = require("path");
const { verifyToken } = require("../middlewares/auth");
const Detection = require("../models/detection");
const { processImageForDetection } = require("../services/mlService");  // Pastikan Anda memiliki service ML

const router = express.Router();

// Inisialisasi GridFS untuk deteksi tanaman
let gfs, gridfsBucket;

mongoose.connection.once("open", () => {
  gridfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "detection", // Bucket untuk deteksi
  });
  gfs = Grid(mongoose.connection.db, mongoose.mongo);
  gfs.collection("detection");
});

// Konfigurasi Multer untuk menyimpan file di memory buffer
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Endpoint untuk menambah deteksi tanaman
router.post("/add", verifyToken, upload.single("photo"), async (req, res) => {
  const { plantName } = req.body;

  // Validasi input yang diperlukan
  if (!plantName) {
    return res.status(400).json({ error: "Plant name is required" });
  }

  try {
    let photoFilename = null;
    let result = null;

    if (req.file) {
      // Generate filename untuk foto dan upload ke GridFS
      photoFilename = `${crypto.randomBytes(16).toString("hex")}${path.extname(req.file.originalname)}`;
      const writeStream = gridfsBucket.openUploadStream(photoFilename, {
        contentType: req.file.mimetype,
      });

      writeStream.end(req.file.buffer, async (err) => {
        if (err) {
          console.error("Error uploading photo:", err);
          return res.status(500).json({ error: "Failed to upload photo" });
        }

        // Proses gambar dengan model ML untuk mendapatkan result
        try {
          result = await processImageForDetection(req.file.buffer);  // Proses ML untuk mendeteksi hasil
          
          if (!result) {
            return res.status(400).json({ error: "Failed to process image with ML service" });
          }

          // Buat entri baru untuk deteksi
          const newDetection = new Detection({
            plantName,
            photo: photoFilename,
            result: result,  // Isi result dengan hasil ML
          });

          await newDetection.save();

          res.status(201).json({
            message: "Detection added successfully",
            detection: newDetection,
          });

        } catch (error) {
          console.error("Error processing image with ML service:", error);
          res.status(500).json({ error: "Failed to process image with ML service" });
        }
      });
    } else {
      return res.status(400).json({ error: "No photo uploaded" });
    }

  } catch (error) {
    console.error("Error adding detection:", error);
    res.status(500).json({ error: "Failed to add detection" });
  }
});

// Endpoint untuk melihat semua deteksi tanaman
router.get("/list", async (req, res) => {
  try {
    const detections = await Detection.find();
    res.status(200).json({
      detections: detections.map((detection) => ({
        plantName: detection.plantName,
        result: detection.result,
        photo: detection.photo
          ? `${req.protocol}://${req.get("host")}/detection/photo/${detection.photo}`
          : null,
        dateTime: detection.dateTime,
      })),
    });
  } catch (error) {
    console.error("Error fetching detections:", error);
    res.status(500).json({ error: "Failed to fetch detections" });
  }
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
