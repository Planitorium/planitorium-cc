const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");
const { Firestore } = require("@google-cloud/firestore");
const { Storage } = require("@google-cloud/storage");
const { verifyToken } = require("../middlewares/auth");

const router = express.Router();

// Inisialisasi Firestore dan Storage
const db = new Firestore({
  projectId: "planitorium",
  databaseId: "planitorium-db",
});
const usersCollection = db.collection("users");
const storage = new Storage();
const bucket = storage.bucket("planitorium-images");

// Konfigurasi Multer untuk menyimpan file di memory buffer
const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage });

// Endpoint untuk mendapatkan profil pengguna
// Endpoint untuk mendapatkan profil pengguna
router.get("/", verifyToken, async (req, res) => {
  try {
    // Menggunakan query untuk mencari pengguna berdasarkan email
    const userDoc = await usersCollection
      .where("email", "==", req.user.email)
      .get();

    // Cek jika dokumen tidak ditemukan
    if (userDoc.empty) {
      return res.status(404).json({ error: "User not found" });
    }

    // Ambil data dari dokumen pertama yang ditemukan
    const user = userDoc.docs[0].data(); // Akses data dari dokumen pertama

    // Kirim response dengan data profil pengguna
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

// Endpoint untuk meng-upload foto ke Cloud Storage
router.post(
  "/upload",
  verifyToken,
  upload.single("photo"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Pastikan req.user.email valid
    console.log("User email from token:", req.user.email);

    try {
      // Membuat nama file unik menggunakan crypto
      const filename = `${crypto.randomBytes(16).toString("hex")}${path.extname(req.file.originalname)}`;
      const blob = bucket.file(filename);
      const blobStream = blob.createWriteStream({
        metadata: { contentType: req.file.mimetype },
      });

      // Menangani error saat meng-upload ke Cloud Storage
      blobStream.on("error", (err) => {
        console.error("Error uploading file to Cloud Storage:", err);
        res.status(500).json({ error: "Failed to upload photo" });
      });

      // Setelah upload selesai, perbarui data foto di Firestore
      blobStream.on("finish", async () => {
        const photoUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;

        try {
          // Mengambil dokumen pengguna berdasarkan email
          const userDoc = await usersCollection
            .where("email", "==", req.user.email)
            .get();
          if (userDoc.empty) {
            return res.status(404).json({ error: "User not found" });
          }

          // Ambil data pengguna dari dokumen pertama yang ditemukan
          const user = userDoc.docs[0].data();

          // Update URL foto di Firestore
          await userDoc.docs[0].ref.update({ photo: photoUrl });

          res.status(200).json({
            message: "Photo uploaded successfully",
            photo: photoUrl,
          });
        } catch (error) {
          console.error("Error updating user photo:", error);
          res.status(500).json({ error: "Failed to update user photo" });
        }
      });

      // Mulai proses upload
      blobStream.end(req.file.buffer);
    } catch (error) {
      console.error("Error uploading photo:", error);
      res.status(500).json({ error: "Failed to upload photo" });
    }
  },
);

// Endpoint untuk mengambil foto berdasarkan URL (opsional jika URL langsung digunakan)
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
