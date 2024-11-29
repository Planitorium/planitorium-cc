const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth"); // Ensure verifyToken is properly imported
const { detectPlant } = require("../services/mlService"); // Import the ML service function

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