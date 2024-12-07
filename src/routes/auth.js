const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Firestore } = require("@google-cloud/firestore");
require("dotenv").config(); // Ensure .env is loaded

const router = express.Router();
const db = new Firestore({
  projectId: "planitorium",
  databaseId: "planitorium-db",
});

// Validator untuk email (format email valid menggunakan regex)
const isValidEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

// Validator untuk password (minimal 8 karakter, mengandung huruf besar, huruf kecil, dan angka)
const isValidPassword = (password) => {
  const passwordRegex = /^(?=(.*[a-zA-Z]))(?=(.*[\d\W]))[a-zA-Z\d\W]{8,}$/;
  return passwordRegex.test(password);
};

// Register endpoint
router.post("/register", async (req, res) => {
  try {
    const { email, password, username } = req.body;

    // Validasi email
    if (!isValidEmail(email)) {
      return res.status(400).json({
        error: true,
        message: "Email invalid",
      });
    }

    // Validasi password
    if (!isValidPassword(password)) {
      return res.status(400).json({
        error: true,
        message:
          "Password must be at least 8 characters, with at least one uppercase letter and one number or special characters",
      });
    }

    const usersCollection = db.collection("users");
    const snapshot = await usersCollection.where("email", "==", email).get();

    if (!snapshot.empty) {
      return res.status(400).json({
        error: true,
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      username: username,
      email: email,
      password: hashedPassword,
    };

    await usersCollection.add(newUser);
    res.status(201).json({
      error: false,
      message: "User registered successfully",
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({
      error: true,
      message: "Internal server error",
    });
  }
});

// Login endpoint
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Cari user berdasarkan email
    const usersCollection = db.collection("users");
    const snapshot = await usersCollection.where("email", "==", email).get();

    if (snapshot.empty) {
      return res.status(401).json({
        error: true,
        message: "Invalid credentials",
      });
    }

    const userDoc = snapshot.docs[0];
    const user = userDoc.data();

    // Cek apakah password cocok
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({
        error: true,
        message: "Invalid credentials",
      });
    }

    // Pastikan JWT_SECRET tersedia
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET environment variable is missing");
      return res.status(500).json({
        error: true,
        message: "Internal server error",
      });
    }

    // Buat JWT token
    const token = jwt.sign(
      { email: user.email, userId: userDoc.id },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      },
    );

    res.status(200).json({
      error: false,
      message: "success",
      result: {
        userId: userDoc.id, // ID pengguna di Firestore
        username: user.username, // Nama pengguna
        token: token, // JWT token untuk autentikasi
      },
    });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({
      error: true,
      message: "Internal server error",
    });
  }
});

module.exports = router;
