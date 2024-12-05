const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");
const { Firestore } = require("@google-cloud/firestore");
const { verifyToken } = require("../middlewares/auth");

const router = express.Router();

// Inisialisasi Firestore
const db = new Firestore({
  projectId: "planitorium",
  databaseId: "planitorium-db",
});
const plantsCollection = db.collection("plants");

// Konfigurasi Multer untuk menyimpan file di buffer memory
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Endpoint untuk menambah tanaman
router.post("/add", verifyToken, upload.single("photo"), async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: "You are missing name field" });
  }

  try {
    const plantId = crypto.randomBytes(8).toString("hex");
    const currentTime = new Date();
    let photoFilename = null;

    if (req.file) {
      // Simpan foto ke Firestore Storage jika diperlukan
      photoFilename = `${plantId}-${req.file.originalname}`;
    }

    // Simpan data tanaman ke Firestore
    const plantData = {
      id: plantId,
      name,
      description: description || null,
      startTime: currentTime,
      endTime: new Date(currentTime.getTime() + 7 * 24 * 60 * 60 * 1000), // +7 hari
      photo: photoFilename,
      createdAt: currentTime,
      updatedAt: currentTime,
    };

    await plantsCollection.doc(plantId).set(plantData);

    res.status(201).json({
      message: "Plant added successfully",
      plant: plantData,
    });
  } catch (error) {
    console.error("Error adding plant:", error);
    res.status(500).json({ error: "Failed to add plant" });
  }
});

// Endpoint untuk melihat detail tanaman berdasarkan ID
router.get("/detail/:id", async (req, res) => {
  try {
    const doc = await plantsCollection.doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Plant not found" });
    }

    const plant = doc.data();
    res.status(200).json({
      plant: {
        ...plant,
        photo: plant.photo
          ? `${req.protocol}://${req.get("host")}/plant/photo/${plant.photo}`
          : null,
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
    const snapshot = await plantsCollection.get();
    const plants = snapshot.docs.map((doc) => {
      const plant = doc.data();
      return {
        ...plant,
        photo: plant.photo
          ? `${req.protocol}://${req.get("host")}/plant/photo/${plant.photo}`
          : null,
      };
    });

    res.status(200).json({ plants });
  } catch (error) {
    console.error("Error fetching plants:", error);
    res.status(500).json({ error: "Failed to fetch plants" });
  }
});

// Endpoint untuk mengambil foto berdasarkan filename (opsional jika Firestore Storage digunakan)
router.get("/photo/:filename", async (req, res) => {
  const { filename } = req.params;

  // Jika Anda menggunakan Firestore Storage untuk menyimpan file, tambahkan logika pengunduhan file di sini
  res
    .status(404)
    .json({ error: "File not found (implement storage logic here)" });
});

module.exports = router;
