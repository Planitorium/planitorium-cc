// routes/plant.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth");  // Correct import
const { detectPlant } = require("../services/mlService"); // Correct import

// Endpoint for detecting plants
router.post("/detect", verifyToken, async (req, res) => {
  try {
    const { photo } = req.body;

    // Call the ML Service to detect the plant
    const result = await detectPlant(photo);

    res.status(200).json({ message: "Detection successful", result });
  } catch (error) {
    res.status(500).json({ error: "Failed to process detection", details: error.message });
  }
});

module.exports = router;
