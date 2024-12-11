const express = require("express");
const dotenv = require("dotenv");
const morgan = require("morgan");
const cors = require("cors");
const loadModel = require("./services/loadModel"); // Model loading function
const authRoutes = require("./routes/auth");
const detectionRoutes = require("./routes/detection");
const plantRoutes = require("./routes/plant");
const profileRoutes = require("./routes/profile");
const storeData = require("./services/storeData"); // Data storage service

dotenv.config();
const app = express();

// Middleware
app.use(express.json()); // Parse JSON request body
app.use(morgan("dev")); // Log HTTP requests
app.use(cors()); // Enable cross-origin requests

// Health check route for Cloud Run (important for Cloud Run health checks)
app.get("/healthz", (req, res) => {
  res.status(200).send("OK");
});

// Function to load the model asynchronously
async function loadModelAsync() {
  try {
    // If model is ready, un-comment this line to load it
    const model = await loadModel(); // Load the model before starting the server
    console.log("Model loaded successfully!");
    return model;
  } catch (error) {
    console.error("Error loading model:", error);
    return null; // Return null if model loading fails
  }
}

// Start the server without waiting for model loading
async function startServer() {
  // Attempt to load model asynchronously in the background
  const model = await loadModelAsync();
  
  // Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/detection", detectionRoutes);
  app.use("/api/plant", plantRoutes);
  app.use("/api/profile", profileRoutes);

  // Global error handling
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ error: "Something went wrong!" });
  });

  // Start the server
  const PORT = process.env.PORT || 3000; // Cloud Run uses the PORT env var by default
  app.listen(PORT, "localhost", () => {
    console.log(`Server is up and running on port ${PORT}`);
  });
}

// Call startServer to initialize the application
startServer();
