// Import
const { predictClassification } = require("../services/mlService");
const loadModel = require("../services/loadModel");
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");
const { verifyToken } = require("../middlewares/auth");
const { Storage } = require("@google-cloud/storage");
const { Firestore } = require("@google-cloud/firestore");

const router = require("express").Router();

// Inisialisasi Firestore dan Google Cloud Storage
const db = new Firestore({
  projectId: "planitorium",
  databaseId: "planitorium-db",
});
const predictionsCollection = db.collection("predictions");

const storage = new Storage();
const bucket = storage.bucket("planitorium-images");

const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage });

// Template Response yang konsisten
const createApiResponse = (error, message, data = {}) => {
  return {
    error,
    message,
    data,
  };
};

// Endpoint untuk menambah deteksi tanaman
router.post("/add", verifyToken, upload.single("photo"), async (req, res) => {
  const { plantName } = req.body;

  // Validasi input
  if (!plantName) {
    return res
      .status(400)
      .json(createApiResponse(true, "Plant name is required"));
  }

  // Validasi file
  if (!req.file || !req.file.buffer) {
    return res
      .status(400)
      .json(createApiResponse(true, "No valid photo uploaded"));
  }

  const validMimeTypes = ["image/jpeg", "image/png"];
  if (!validMimeTypes.includes(req.file.mimetype)) {
    return res
      .status(400)
      .json(
        createApiResponse(
          true,
          "Uploaded file is not a valid image (JPEG/PNG)",
        ),
      );
  }

  try {
    const photoBuffer = req.file.buffer;
    const photoFilename = `${crypto.randomBytes(16).toString("hex")}${path.extname(req.file.originalname)}`;
    const blob = bucket.file(photoFilename);
    const blobStream = blob.createWriteStream({
      metadata: { contentType: req.file.mimetype },
    });

    // Handle error upload ke Cloud Storage
    blobStream.on("error", (err) => {
      console.error("Error uploading file to Cloud Storage:", err);
      return res
        .status(500)
        .json(
          createApiResponse(true, "Failed to upload photo to Cloud Storage"),
        );
    });

    // On finish, get photo URL dan lanjutkan prediksi
    blobStream.on("finish", async () => {
      const photoUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;

      try {
        // Load model dan proses gambar untuk klasifikasi
        const model = await loadModel();
        const result = await predictClassification(model, photoBuffer);

        if (!result) {
          return res
            .status(400)
            .json(
              createApiResponse(
                true,
                "Failed to process image with ML service",
              ),
            );
        }

        // Simpan hasil prediksi ke Firestore dengan menambahkan field 'id'
        const newDetection = {
          plantName,
          result: result.label,
          confidence: result.confidence,
          suggestion: result.suggestion,
          photo: photoFilename,
          photoUrl: photoUrl,
          createdAt: new Date().toISOString(),
        };

        // Menambahkan dokumen ke Firestore dan mendapatkan ID yang dihasilkan oleh Firestore
        const docRef = await predictionsCollection.add(newDetection);

        // Setelah dokumen ditambahkan, update dokumen dengan field 'id'
        await docRef.update({ id: docRef.id });

        // Kembalikan data termasuk 'id' Firestore yang telah disimpan dalam field
        res.status(201).json(
          createApiResponse(false, "Detection added successfully", {
            id: docRef.id, // ID Firestore yang dihasilkan
            plantName,
            result: result.label,
            suggestion: result.suggestion,
            confidence: result.confidence,
            photoUrl: photoUrl,
            createdAt: new Date().toISOString(),
          }),
        );
      } catch (error) {
        console.error("Error during prediction:", error);
        res
          .status(500)
          .json(createApiResponse(true, "Error during model prediction"));
      }
    });

    // Mulai proses upload foto ke Cloud Storage
    blobStream.end(req.file.buffer);
  } catch (error) {
    console.error("Error adding detection:", error);
    res.status(500).json(createApiResponse(true, "Failed to add detection"));
  }
});

// Endpoint untuk melihat semua deteksi tanaman
router.get("/list", async (req, res) => {
  try {
    const detectionsSnapshot = await predictionsCollection
      .orderBy("createdAt", "desc")
      .get();

    const detections = detectionsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json(
      createApiResponse(false, "List of detections fetched successfully", {
        detections: detections.map((detection) => ({
          id: detection.id,
          plantName: detection.plantName,
          result: detection.result,
          confidence: detection.confidence,
          createdAt: detection.createdAt,
          photoUrl: detection.photoUrl, // Include photo URL
        })),
      }),
    );
  } catch (error) {
    console.error("Error fetching detections:", error);
    res.status(500).json(createApiResponse(true, "Failed to fetch detections"));
  }
});

// Endpoint untuk melihat detail deteksi berdasarkan ID
router.get("/detail/:id", async (req, res) => {
  try {
    const detectionId = req.params.id;  // ID yang diterima dari parameter URL
    console.log("Looking for detection with ID:", detectionId);  // Log ID yang diterima

    const doc = await predictionsCollection.doc(detectionId).get();

    // Log untuk memastikan apakah dokumen ditemukan
    if (!doc.exists) {
      console.log(`No detection found with ID: ${detectionId}`);
      return res.status(404).json({
        error: true,
        message: "detection not found",
      });
    }

    const detection = doc.data();
    res.status(200).json({
      error: false,
      detection: {
        id: doc.id, // Kembalikan ID dari dokumen Firestore
        ...detection,
        photo: detection.photo
          ? `${req.protocol}://${req.get("host")}/api/detection/photo/${detection.photo}`
          : null,
      },
    });
  } catch (error) {
    console.error("Error fetching detection detail:", error);
    res.status(500).json({
      error: true,
      message: "Failed to fetch detection detail",
    });
  }
});

// Endpoint untuk filter deteksi berdasarkan 'result' (label klasifikasi)
router.get("/list/filter", async (req, res) => {
  const { result } = req.query;

  if (!result) {
    return res
      .status(400)
      .json(createApiResponse(true, "Missing 'result' query parameter"));
  }

  try {
    const detectionsSnapshot = await predictionsCollection
      .where("result", "==", result)
      .get();

    if (detectionsSnapshot.empty) {
      return res
        .status(404)
        .json(
          createApiResponse(
            true,
            "No detections found for the specified result",
          ),
        );
    }

    const detections = detectionsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json(
      createApiResponse(
        false,
        `List of detections filtered by result: ${result}`,
        {
          detections: detections.map((detection) => ({
            id: detection.id, // Include ID for each detection
            plantName: detection.plantName,
            result: detection.result,
            suggestion: detection.suggestion,
            confidence: detection.confidence,
            createdAt: detection.createdAt,
            photoUrl: detection.photoUrl, // Include photo URL for each detection
          })),
        },
      ),
    );
  } catch (error) {
    console.error("Error fetching filtered detections:", error);
    res
      .status(500)
      .json(createApiResponse(true, "Failed to fetch filtered detections"));
  }
});

// Endpoint untuk mengambil foto berdasarkan filename
router.get("/photo/:filename", async (req, res) => {
  try {
    const file = bucket.file(req.params.filename);
    const [exists] = await file.exists();
    if (!exists)
      return res.status(404).json(createApiResponse(true, "File not found"));

    const readStream = file.createReadStream();
    readStream.on("error", (err) => {
      console.error("Error reading file:", err);
      res.status(500).json(createApiResponse(true, "Failed to fetch photo"));
    });

    res.set("Content-Type", file.metadata.contentType);
    readStream.pipe(res);
  } catch (error) {
    console.error("Error fetching photo:", error);
    res.status(500).json(createApiResponse(true, "Failed to fetch photo"));
  }
});

module.exports = router;
