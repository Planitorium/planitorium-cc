const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");
const { verifyToken } = require("../middlewares/auth");
const { predictClassification } = require("../services/mlService"); // Pastikan Anda memiliki service ML
const { Storage } = require("@google-cloud/storage");
const { Firestore } = require("@google-cloud/firestore"); // Firestore SDK
const loadModel = require("../services/loadModel");

const router = express.Router();

// Inisialisasi Firestore
const db = new Firestore({
  projectId: "planitorium",
  databaseId: "planitorium-db",
});
const predictionsCollection = db.collection("predictions");

// Inisialisasi Google Cloud Storage
const storage = new Storage();
const bucket = storage.bucket("planitorium-images");

// Konfigurasi Multer untuk menyimpan file di memory buffer
const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage });

// Endpoint untuk menambah deteksi tanaman
router.post("/add", verifyToken, upload.single("photo"), async (req, res) => {
  const { plantName } = req.body;

  if (!plantName) {
    return res.status(400).json({ error: "Plant name is required" });
  }

  if (!req.file) {
    return res.status(400).json({ error: "No photo uploaded" });
  }

  try {
    const photoBuffer = req.file.buffer;
    const photoFilename = `${crypto.randomBytes(16).toString("hex")}${path.extname(req.file.originalname)}`;
    const blob = bucket.file(photoFilename);
    const blobStream = blob.createWriteStream({
      metadata: { contentType: req.file.mimetype },
    });

    // Menangani error saat meng-upload ke Cloud Storage
    blobStream.on("error", (err) => {
      console.error("Error uploading file to Cloud Storage:", err);
      return res
        .status(500)
        .json({ error: "Failed to upload photo to Cloud Storage" });
    });

    // Setelah upload selesai, kita dapat mengambil URL foto
    blobStream.on("finish", async () => {
      const photoUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;

      // Memuat model TensorFlow
      const model = await loadModel();

      // Proses gambar dengan model ML untuk mendapatkan hasil prediksi
      const result = await predictClassification(model, photoBuffer); // Fungsi prediksi sekarang menerima model sebagai argumen
      if (!result) {
        return res
          .status(400)
          .json({ error: "Failed to process image with ML service" });
      }

      // Simpan hasil prediksi ke Firestore dengan URL foto yang baru
      const newDetection = {
        plantName,
        result: result.label,
        confidence: result.confidence,
        suggestion: result.suggestion,
        photo: photoFilename, // Simpan nama file foto di Firestore
        photoUrl: photoUrl, // Simpan URL foto di Firestore
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
          photoUrl: photoUrl, // Kembalikan URL foto
          createdAt: new Date().toISOString(),
        },
      });
    });

    // Mulai proses upload ke Cloud Storage
    blobStream.end(req.file.buffer);
  } catch (error) {
    console.error("Error adding detection:", error);
    res.status(500).json({ error: "Failed to add detection" });
  }
});

// Endpoint untuk melihat semua deteksi tanaman
router.get("/list", async (req, res) => {
  try {
    const detectionsSnapshot = await predictionsCollection.get();
    const detections = detectionsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({
      detections: detections.map((detection) => ({
        plantName: detection.plantName,
        result: detection.result,
        suggestion: detection.suggestion,
        confidence: detection.confidence,
        createdAt: detection.createdAt,
        photoUrl: detection.photoUrl, // Kembalikan URL foto untuk setiap deteksi
      })),
    });
  } catch (error) {
    console.error("Error fetching detections:", error);
    res.status(500).json({ error: "Failed to fetch detections" });
  }
});

// Endpoint untuk mengambil foto berdasarkan filename (opsional)
router.get("/photo/:filename", async (req, res) => {
  try {
    const file = bucket.file(req.params.filename);
    const [exists] = await file.exists();
    if (!exists) return res.status(404).json({ error: "File not found" });

    const readStream = file.createReadStream();
    readStream.on("error", (err) => {
      console.error("Error reading file:", err);
      res.status(500).json({ error: "Failed to fetch photo" });
    });

    res.set("Content-Type", file.metadata.contentType);
    readStream.pipe(res);
  } catch (error) {
    console.error("Error fetching photo:", error);
    res.status(500).json({ error: "Failed to fetch photo" });
  }
});

module.exports = router;
