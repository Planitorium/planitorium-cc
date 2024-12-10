const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");
const { Firestore } = require("@google-cloud/firestore");
const { Storage } = require("@google-cloud/storage");
const { verifyToken } = require("../middlewares/auth");

const router = express.Router();

// Inisialisasi Firestore
const db = new Firestore({
  projectId: "planitorium",
  databaseId: "planitorium-db",
});
const plantsCollection = db.collection("plants");

// Konfigurasi Multer untuk menyimpan file di buffer memory
const storage = new Storage();
const bucket = storage.bucket("planitorium-images");

// Konfigurasi Multer untuk menyimpan file di memory buffer
const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage });

// Endpoint untuk menambah tanaman
router.post("/add", verifyToken, upload.single("photo"), async (req, res) => {
  const { name, description, startTime, endTime } = req.body;

  // Validasi missing fields
  if (!name) {
    return res.status(400).json({
      error: true,
      message: "Missing 'name' field",
    });
  }

  if (!startTime || !endTime) {
    return res.status(400).json({
      error: true,
      message: "Missing 'startTime' or 'endTime' fields",
    });
  }

  if (!req.file) {
    return res.status(400).json({
      error: true,
      message: "Missing 'photo' field",
    });
  }

  try {
    const plantId = crypto.randomBytes(8).toString("hex");
    const currentTime = new Date();

    // Mengubah startTime dan endTime ke format string YYYY-MM-DD
    const formattedStartTime = new Date(startTime).toISOString().split("T")[0];
    const formattedEndTime = new Date(endTime).toISOString().split("T")[0];
    const formattedCreatedAt = new Date(currentTime)
      .toISOString()
      .split("T")[0];
    const formattedUpdatedAt = new Date(currentTime)
      .toISOString()
      .split("T")[0];

    // Validasi format tanggal
    if (
      isNaN(new Date(startTime).getTime()) ||
      isNaN(new Date(endTime).getTime())
    ) {
      return res.status(400).json({
        error: true,
        message: "Invalid 'startTime' or 'endTime' format",
      });
    }

    // Validasi agar endTime tidak lebih kecil dari startTime
    if (new Date(endTime) < new Date(startTime)) {
      return res.status(400).json({
        error: true,
        message: "'endTime' cannot be earlier than 'startTime'",
      });
    }

    let photoFilename = `${plantId}-${req.file.originalname}`;
    let photoUrl = null;

    // Proses upload foto ke Google Cloud Storage
    const blob = bucket.file(photoFilename);
    const blobStream = blob.createWriteStream({
      metadata: { contentType: req.file.mimetype },
    });

    await new Promise((resolve, reject) => {
      blobStream.on("error", (err) => reject(err));
      blobStream.on("finish", () => resolve());
      blobStream.end(req.file.buffer);
    });

    photoUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;

    // Menyimpan data tanaman ke Firestore dengan startTime dan endTime sebagai string
    const plantData = {
      id: plantId,
      name,
      description: description || null,
      startTime: formattedStartTime, // Simpan sebagai string
      endTime: formattedEndTime, // Simpan sebagai string
      photo: photoFilename,
      createdAt: formattedCreatedAt,
      updatedAt: formattedUpdatedAt,
    };

    await plantsCollection.doc(plantId).set(plantData);

    res.status(201).json({
      error: false,
      message: "Plant added successfully",
      plant: plantData,
      photoUrl: photoUrl, // Include photo URL in the response
    });
  } catch (error) {
    console.error("Error adding plant:", error);
    res.status(500).json({
      error: true,
      message: "Failed to add plant",
    });
  }
});

// Endpoint untuk melihat detail tanaman berdasarkan ID
router.get("/detail/:id", async (req, res) => {
  try {
    const doc = await plantsCollection.doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({
        error: true,
        message: "Plant not found",
      });
    }

    const plant = doc.data();
    res.status(200).json({
      error: false,
      plant: {
        ...plant,
        photo: plant.photo
          ? `${req.protocol}://${req.get("host")}/api/plant/photo/${plant.photo}`
          : null,
      },
    });
  } catch (error) {
    console.error("Error fetching plant detail:", error);
    res.status(500).json({
      error: true,
      message: "Failed to fetch plant detail",
    });
  }
});

// Endpoint untuk melihat semua tanaman, diurutkan berdasarkan created_at terbaru
router.get("/list", async (req, res) => {
  try {
    const snapshot = await plantsCollection
      .orderBy("createdAt", "desc") // Menambahkan urutan berdasarkan created_at secara menurun
      .get();

    const plants = snapshot.docs.map((doc) => {
      const plant = doc.data();

      // Tidak perlu mengonversi lagi karena sudah disimpan sebagai string
      return {
        ...plant,
        photo: plant.photo
          ? `${req.protocol}://${req.get("host")}/api/plant/photo/${plant.photo}`
          : null,
      };
    });

    res.status(200).json({
      error: false,
      plants,
    });
  } catch (error) {
    console.error("Error fetching plants:", error);
    res.status(500).json({
      error: true,
      message: "Failed to fetch plants",
    });
  }
});

// Endpoint untuk mengambil foto berdasarkan filename
router.get("/photo/:filename", async (req, res) => {
  try {
    const file = bucket.file(req.params.filename);
    const [exists] = await file.exists();

    // Jika file tidak ada, kirimkan error
    if (!exists) {
      return res.status(404).json({
        error: true,
        message: "File not found",
      });
    }

    // Menggunakan `readStream` untuk mengakses file
    const readStream = file.createReadStream();

    // Menangani error saat membaca file
    readStream.on("error", (err) => {
      console.error("Error reading file:", err);
      res.status(500).json({
        error: true,
        message: "Failed to fetch photo",
      });
    });

    // Set konten type dan kirimkan file ke klien
    res.set("Content-Type", file.metadata.contentType);
    readStream.pipe(res);
  } catch (error) {
    console.error("Error fetching photo:", error);
    res.status(500).json({
      error: true,
      message: "Failed to fetch photo",
    });
  }
});

// Endpoint untuk filter tanaman berdasarkan endTime
router.get("/list/filter", async (req, res) => {
  const { endTime } = req.query;

  // Pastikan endTime valid
  const parsedEndTime = new Date(endTime);
  if (isNaN(parsedEndTime.getTime())) {
    return res.status(400).json({
      error: true,
      message: "Invalid 'endTime' format. Please provide a valid date.",
    });
  }

  try {
    // Ambil data tanaman yang endTime-nya lebih kecil atau sama dengan parsedEndTime
    const snapshot = await plantsCollection
      .where("endTime", "=", endTime) // Filter berdasarkan endTime string
      .get();

    // Jika tidak ada data tanaman yang cocok
    if (snapshot.empty) {
      return res.status(404).json({
        error: true,
        message: "No plants found with the specified endTime",
      });
    }

    // Ambil data tanaman dan formatkan foto
    const plants = snapshot.docs.map((doc) => {
      const plant = doc.data();
      return {
        ...plant,
        photo: plant.photo
          ? `${req.protocol}://${req.get("host")}/api/plant/photo/${plant.photo}`
          : null,
      };
    });

    res.status(200).json({
      error: false,
      plants,
    });
  } catch (error) {
    console.error("Error fetching plants:", error);
    res.status(500).json({
      error: true,
      message: "Failed to fetch plants",
    });
  }
});

module.exports = router;
