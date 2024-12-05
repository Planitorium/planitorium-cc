const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");
const { verifyToken } = require("../middlewares/auth");
const { predictClassification } = require("../services/mlService");  // Pastikan Anda memiliki service ML
const storeData = require("../services/storeData");  // Fungsi untuk menyimpan data ke Firestore
const { Firestore } = require('@google-cloud/firestore');  // Firestore SDK
const loadModel = require("../services/loadModel");

const router = express.Router();

// Konfigurasi Multer untuk menyimpan file di memory buffer
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Inisialisasi Firestore
const db = new Firestore({
  projectId: 'planitorium',
  databaseId: 'planitorium-db'
});

const predictionsCollection = db.collection('predictions');

// Endpoint untuk menambah deteksi tanaman

router.post("/add", verifyToken, upload.single("photo"), async (req, res) => {
  const { plantName } = req.body;

  if (!plantName) {
    return res.status(400).json({ error: "Plant name is required" });
  }

  try {
    if (req.file) {
      const photoBuffer = req.file.buffer;

      // Memuat model TensorFlow
      const model = await loadModel();

      // Proses gambar dengan model ML untuk mendapatkan hasil prediksi
      const result = await predictClassification(model, photoBuffer);  // Fungsi prediksi sekarang menerima model sebagai argumen
      if (!result) {
        return res.status(400).json({ error: "Failed to process image with ML service" });
      }

      // Simpan hasil prediksi ke Firestore
      const newDetection = {
        plantName,
        result: result.label,
        confidence: result.confidence,
        suggestion: result.suggestion,
        createdAt: new Date().toISOString(),
      };

      const docRef = await predictionsCollection.add(newDetection);

      res.status(201).json({
        message: "Detection added successfully",
        detection: {
          id: docRef.id,
          plantName,
          result: result.label,
          suggestion: result.suggestion,
          confidence: result.confidence,
          createdAt: new Date().toISOString(),
        },
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
    const detectionsSnapshot = await predictionsCollection.get();
    const detections = detectionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({
      detections: detections.map(detection => ({
        plantName: detection.plantName,
        result: detection.result,
        suggestion: detection.suggestion,
        confidence: detection.confidence,
        createdAt: detection.createdAt,
        photo: detection.photo ? `${req.protocol}://${req.get("host")}/detection/photo/${detection.photo}` : null,
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
    // Ambil file berdasarkan nama dari Firestore
    const fileDoc = await predictionsCollection.where('photo', '==', req.params.filename).limit(1).get();

    if (fileDoc.empty) {
      return res.status(404).json({ error: "File not found" });
    }

    const file = fileDoc.docs[0].data();
    const photoBuffer = file.photo;  // Data foto sebagai buffer

    res.set("Content-Type", "image/jpeg"); // Sesuaikan tipe konten jika diperlukan
    res.send(photoBuffer);  // Kirim buffer sebagai respons
  } catch (error) {
    console.error("Error fetching photo:", error);
    res.status(500).json({ error: "Failed to fetch photo" });
  }
});

module.exports = router;