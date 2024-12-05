const express = require("express");
const dotenv = require("dotenv");
const morgan = require("morgan");
const cors = require("cors");
const loadModel = require("./services/loadModel");
// Import routes
const authRoutes = require("./routes/auth");
const detectionRoutes = require("./routes/detection");
const plantRoutes = require("./routes/plant");
const profileRoutes = require("./routes/profile");
const storeData = require("./services/storeData"); // Import module storeData

dotenv.config();
const app = express();

// Middleware
app.use(express.json()); // Parsing JSON request body
app.use(morgan("dev")); // Logging HTTP requests
app.use(cors()); // Mengizinkan cross-origin requests

// Function to load model asynchronously
async function startServer() {
  try {
    //nanti ini di uncommand kalo ml model uda siap
    // const model = await loadModel(); // Load model before starting the server
    console.log("Model loaded successfully!");

    // Routes
    app.use("/api/auth", authRoutes);
    app.use("/api/detection", detectionRoutes);
    app.use("/api/plant", plantRoutes);
    app.use("/api/profile", profileRoutes);
    // Tambahkan rute lainnya di sini...

    // Global error handling
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).send({ error: "Something went wrong!" });
    });

    // Server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (error) {
    console.error("Error loading model:", error);
  }
}

// Call startServer to initialize the application
startServer();
