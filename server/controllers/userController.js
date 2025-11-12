const { User } = require("../models/sequelize");
const bcrypt = require("bcryptjs");
const crypto = require('crypto');
const db = require("../config/database");

// === Controlador per registrar un nou usuari ===
const register = async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ msg: "Si us plau, inclou usuari, email i contrasenya" });
  }

  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ msg: "L'email ja existeix" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      username: username,
      email: email,
      password: hashedPassword,
    });

    res.status(201).json({ msg: "Usuario registrado con éxito", userId: newUser.id });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Error del servidor");
  }
};

// === Controlador per iniciar sessió ===
const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res
        .status(400)
        .json({ msg: "Credencials invàlides (email no trobat)" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ msg: "Credencials invàlides (contrasenya incorrecta)" });
    }

    // Generate a simple token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Save token to user
    user.auth_token = token;
    await user.save();

    res.json({ 
      msg: "Inicio de sesión exitoso", 
      username: user.username,
      token: token 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Error del servidor");
  }
};

const getStatsByUsername = async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ where: { username: username } });

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Get aggregated stats from performances table (raw SQL)
    const [performanceStats] = await db.execute(
      `SELECT 
        COUNT(*) as total_games, 
        SUM(reps) as total_reps, 
        AVG(score) as average_score 
      FROM performances WHERE user_id = ?`,
      [user.id]
    );

    // Get best results from resultats_globals (raw SQL)
    const [globalResults] = await db.execute(
      `SELECT 
        MAX(repeticions_totals) as max_reps_global 
      FROM resultats_globals WHERE user_id = ?`,
      [user.id]
    );

    const response = {
      username: user.username,
      wins: user.wins,
      looses: user.looses,
      totalScore: user.score,
      bestScore: user.best_score,
      totalGames: performanceStats[0].total_games || 0,
      totalReps: performanceStats[0].total_reps || 0,
      averagePerformanceScore: parseFloat(performanceStats[0].average_score || 0).toFixed(2),
      maxRepsInAGame: globalResults[0].max_reps_global || 0,
    };

    res.json(response);

  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};


module.exports = {
  register,
  login,
  getStatsByUsername,
};
