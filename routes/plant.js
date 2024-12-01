const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Grid = require("gridfs-stream");
const path = require("path");
const { verifyToken } = require("../middlewares/auth");
const Plant = require("../models/plant");

const router = express.Router();

// Inisialisasi GridFS
let gfs, gridfsBucket;

mongoose.connection.once("open", () => {
  gridfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "plant",
  });
  gfs = Grid(mongoose.connection.db, mongoose.mongo);
  gfs.collection("plant");
});

// Konfigurasi Multer untuk menyimpan file di memory buffer
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Endpoint untuk menambah tanaman
router.post("/add", verifyToken, upload.single("photo"), async (req, res) => {
  const { name, description } = req.body;

  // Validasi input yang diperlukan
  if (!name) {
    return res.status(400).json({ error: "You are missing name field" });
  }

  try {
    let photoFilename = null;
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
      });
    }

    // Tetapkan nilai default untuk startTime dan endTime jika tidak diberikan
    const currentTime = new Date();
    const newPlant = new Plant({
      name,
      description,
      startTime: currentTime,
      endTime: new Date(currentTime.getTime() + 1 * 24 * 60 * 60 * 1000), // 7 hari setelah startTime
      photo: photoFilename,
    });

    await newPlant.save();

    res.status(201).json({
      message: "Plant added successfully",
      plant: newPlant,
    });
  } catch (error) {
    console.error("Error adding plant:", error);
    res.status(500).json({ error: "Failed to add plant" });
  }
});

// Endpoint untuk melihat detail tanaman berdasarkan ID
router.get("/detail/:id", async (req, res) => {
  try {
    const plant = await Plant.findById(req.params.id);
    if (!plant) return res.status(404).json({ error: "Plant not found" });

    res.status(200).json({
      plant: {
        name: plant.name,
        description: plant.description,
        startTime: plant.startTime,
        endTime: plant.endTime,
        photo: plant.photo ? `${req.protocol}://${req.get("host")}/plant/photo/${plant.photo}` : null,
      },
    });
  } catch (error) {
    console.error("Error fetching plant detail:", error);
    res.status(500).json({ error: "Failed to fetch plant detail" });
  }
});

// Endpoint untuk melihat semua tanaman
router.get("/list", async (req, res) => {
  try {
    const plants = await Plant.find();
    res.status(200).json({
      plants: plants.map((plant) => ({
        name: plant.name,
        description: plant.description,
        startTime: plant.startTime,
        endTime: plant.endTime,
        photo: plant.photo ? `${req.protocol}://${req.get("host")}/plant/photo/${plant.photo}` : null,
      })),
    });
  } catch (error) {
    console.error("Error fetching plants:", error);
    res.status(500).json({ error: "Failed to fetch plants" });
  }
});

// Endpoint untuk mengambil foto berdasarkan filename
router.get("/photo/:filename", async (req, res) => {
  const { filename } = req.params;
  // console.log("Requesting photo with filename:", filename);

  try {
    // Cari file di GridFS berdasarkan filename
    const file = await gfs.files.findOne({ filename });
    if (!file) {
      console.error("File not found in database:", filename);
      return res.status(404).json({ error: "File not found" });
    }

    // console.log("File found:", file.filename);

    // Mengambil stream file dari GridFS
    const readStream = gridfsBucket.openDownloadStreamByName(file.filename);
    res.set("Content-Type", file.contentType);  // Atur Content-Type sesuai dengan file yang ada
    readStream.pipe(res);  // Kirim stream file ke response
  } catch (error) {
    console.error("Error fetching photo:", error);
    res.status(500).json({ error: "Failed to fetch photo" });
  }
});



module.exports = router;
