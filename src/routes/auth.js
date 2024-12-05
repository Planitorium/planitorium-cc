const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Firestore } = require('@google-cloud/firestore');
require('dotenv').config(); // Ensure .env is loaded

const router = express.Router();
const db = new Firestore({
  projectId: 'planitorium',
  databaseId: 'planitorium-db',
});

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const usersCollection = db.collection('users');
    const snapshot = await usersCollection.where('email', '==', req.body.email).get();

    if (!snapshot.empty) return res.status(400).json({ error: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const newUser = {
      username: req.body.username,
      email: req.body.email,
      password: hashedPassword,
    };

    await usersCollection.add(newUser);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const usersCollection = db.collection('users');
    const snapshot = await usersCollection.where('email', '==', req.body.email).get();

    if (snapshot.empty) return res.status(401).json({ error: 'Invalid credentials' });

    const userDoc = snapshot.docs[0];
    const user = userDoc.data();

    const passwordMatch = await bcrypt.compare(req.body.password, user.password);
    if (!passwordMatch) return res.status(401).json({ error: 'Invalid credentials' });

    // Ensure JWT_SECRET is available
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET environment variable is missing');
      return res.status(500).json({ error: 'Internal server error' });
    }

    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ token });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout endpoint
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(200).json({ message: 'No active session found.' });

    const token = authHeader.split(' ')[1];
    const blacklistCollection = db.collection('blacklist');

    const snapshot = await blacklistCollection.where('token', '==', token).get();
    if (!snapshot.empty) {
      return res.status(200).json({ message: 'Token already blacklisted, you are logged out.' });
    }

    await blacklistCollection.add({ token });
    res.status(200).json({ message: 'You are logged out!' });
  } catch (error) {
    console.error('Error logging out user:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal Server Error',
    });
  }
});

module.exports = router;