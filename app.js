const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const detectionRoutes = require('./routes/detection');
const plantRoutes = require('./routes/plant');
const profileRoutes = require('./routes/profile'); 
// Tambahkan rute lainnya di sini...

dotenv.config();
const app = express();

// Middleware
app.use(express.json());


// Database connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/detection', detectionRoutes);
app.use('/api/plant', plantRoutes);
app.use('/api/profile', profileRoutes);
// Tambahkan rute lainnya di sini...

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));