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

// Endpoint untuk mendapatkan profil pengguna beserta foto dalam bentuk URL
router.get("/", verifyToken, async (req, res) => {
  try {
    // Menggunakan query untuk mencari pengguna berdasarkan email
    const userDoc = await usersCollection
      .where("email", "==", req.user.email)
      .get();

    // Cek jika dokumen tidak ditemukan
    if (userDoc.empty) {
      return res.status(404).json({
        error: true,
        message: "User not found",
      });
    }

    // Ambil data dari dokumen pertama yang ditemukan
    const user = userDoc.docs[0].data();

    // Jika foto ada, ambil URL foto dari Cloud Storage
    if (user.photo) {
      const fileName = user.photo.split("/").pop(); // Ambil nama file dari URL foto
      const file = bucket.file(fileName);
      const [exists] = await file.exists();

      if (exists) {
        // Generate URL foto langsung
        const photoUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

        // Kirim profil dengan foto dalam bentuk URL
        res.status(200).json({
          error: false,
          message: "Profile retrieved successfully",
          profile: {
            username: user.username,
            email: user.email,
            photo: photoUrl, // Kirim URL foto
          },
        });
      } else {
        res.status(404).json({
          error: true,
          message: "Photo not found",
        });
      }
    } else {
      // Jika tidak ada foto
      res.status(200).json({
        error: false,
        message: "Profile retrieved successfully",
        profile: {
          username: user.username,
          email: user.email,
          photo: null,
        },
      });
    }
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({
      error: true,
      message: "Failed to fetch profile",
    });
  }
});

// Endpoint untuk mendapatkan foto pengguna sebagai gambar
router.get("/photo", verifyToken, async (req, res) => {
  try {
    // Menggunakan query untuk mencari pengguna berdasarkan email
    const userDoc = await usersCollection
      .where("email", "==", req.user.email)
      .get();

    // Cek jika dokumen tidak ditemukan
    if (userDoc.empty) {
      return res.status(404).json({
        error: true,
        message: "User not found",
      });
    }

    // Ambil data pengguna
    const user = userDoc.docs[0].data();

    // Jika foto ada, ambil foto dari Cloud Storage
    if (user.photo) {
      const file = bucket.file(user.photo.split("/").pop()); // Ambil nama file dari URL foto
      const [exists] = await file.exists();

      if (exists) {
        // Kirim foto sebagai stream
        const readStream = file.createReadStream();

        readStream.on("error", (err) => {
          console.error("Error fetching photo:", err);
          return res.status(500).json({
            error: true,
            message: "Failed to fetch photo",
          });
        });

        // Set Content-Type foto dan kirim gambar
        res.set("Content-Type", file.metadata.contentType);
        readStream.pipe(res);
      } else {
        res.status(404).json({
          error: true,
          message: "Photo not found",
        });
      }
    } else {
      res.status(404).json({
        error: true,
        message: "No photo available",
      });
    }
  } catch (error) {
    console.error("Error fetching photo:", error);
    res.status(500).json({
      error: true,
      message: "Failed to fetch photo",
    });
  }
});

// Endpoint untuk meng-upload foto ke Cloud Storage
router.post(
  "/upload",
  verifyToken,
  upload.single("photo"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        error: true,
        message: "No file uploaded",
      });
    }

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
        res.status(500).json({
          error: true,
          message: "Failed to upload photo",
        });
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
            return res.status(404).json({
              error: true,
              message: "User not found",
            });
          }

          // Update URL foto di Firestore
          await userDoc.docs[0].ref.update({ photo: photoUrl });

          res.status(200).json({
            error: false,
            message: "Photo uploaded successfully",
            photo: photoUrl,
          });
        } catch (error) {
          console.error("Error updating user photo:", error);
          res.status(500).json({
            error: true,
            message: "Failed to update user photo",
          });
        }
      });

      // Mulai proses upload
      blobStream.end(req.file.buffer);
    } catch (error) {
      console.error("Error uploading photo:", error);
      res.status(500).json({
        error: true,
        message: "Failed to upload photo",
      });
    }
  },
);

module.exports = router;
