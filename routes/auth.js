const express = require('express');
const router = express.Router();
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Blacklist = require('../models/blacklist');  // Mengimpor model Blacklist

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) return res.status(400).json({ error: 'Email already exists' });
    
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const newUser = new User({
      username: req.body.username,
      email: req.body.email,
      password: hashedPassword,
    });

    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const passwordMatch = await bcrypt.compare(req.body.password, user.password);
    if (!passwordMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout endpoint
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers['cookie'];
    if (!authHeader) {
      return res.status(200).json({ message: 'No active session found.' }); // Tidak ada sesi yang aktif
    }

    // Mengambil token dari cookie
    const cookie = authHeader.split('=')[1];
    const accessToken = cookie.split(';')[0];

    // Memeriksa apakah token ada di blacklist
    const checkIfBlacklisted = await Blacklist.findOne({ token: accessToken });
    if (checkIfBlacklisted) {
      return res.status(200).json({ message: 'Token already blacklisted, you are logged out.' }); // Token sudah diblacklist
    }

    // Jika token belum diblacklist, tambahkan ke blacklist
    const newBlacklist = new Blacklist({
      token: accessToken,
    });
    await newBlacklist.save();

    // Menghapus cookie di sisi client dengan header Clear-Site-Data
    res.setHeader('Clear-Site-Data', '"cookies"');

    // Mengirimkan respon logout berhasil
    res.status(200).json({ message: 'You are logged out!' });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Internal Server Error',
    });
  }
});

module.exports = router;
