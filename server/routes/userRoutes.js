// routes/userRoutes.js / DE PROVA, PENDENT DE SUSTITUIR !!!!!!!!

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { findUserByUsername, createUser } = require('../models/User');

// === REGISTRE ===
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Si us plau, omple tots els camps.' });
    }

    const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Aquest correu ja està registrat.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );

    const userId = result.insertId;

    res.status(201).json({
      id: userId,
      username,
      token: generateToken(userId)
    });

  } catch (error) {
    console.error(' Error en el registre:', error);
    res.status(500).json({ message: 'Error en el registre', error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Credencials incorrectes.' });
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Credencials incorrectes.' });
    }

    const token = generateToken(user.id);

    res.json({
      id: user.id,
      username: user.username,
      token
    });

  } catch (error) {
    console.error('Error en el login:', error);
    res.status(500).json({ message: 'Error en el login', error: error.message });
  }
});

module.exports = router;

router.get('/leaderboard', async (req, res) => {
  const [rows] = await pool.query(`
    SELECT username, MAX(score) AS best_score
    FROM game_scores
    GROUP BY username
    ORDER BY best_score DESC
    LIMIT 10
  `);
  res.json(rows);
});

