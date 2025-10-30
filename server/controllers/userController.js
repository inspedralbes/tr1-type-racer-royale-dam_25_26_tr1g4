const { Op } = require("sequelize");
const User = require("../models/user");
const bcrypt = require("bcryptjs");

// === Controlador per registrar un nou usuari ===
// userController.js

// === Controlador per registrar un nou usuari ===
const register = async (req, res) => {
  // 👇 1. AFEGEIX 'email' AQUÍ
  const { username, email, password } = req.body;

  // 👇 2. AFEGEIX VALIDACIÓ PER EMAIL
  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ msg: "Si us plau, inclou usuari, email i contrasenya" });
  }

  try {
    // Comprovem si l'email O l'usuari ja existeixen
    const existingUser = await User.findOne({
      where: { [Op.or]: [{ username }, { email }] },
    });
    if (existingUser) {
      return res.status(400).json({ msg: "L'usuari o l'email ja existeixen" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 👇 3. AFEGEIX 'email' A LA CREACIÓ
    const newUser = await User.create({
      username: username,
      email: email, // <--- AFEGIT
      password: hashedPassword,
    });

    // Simplemente confirmamos el registro y devolvemos el nombre de usuario
    res.status(201).json({ msg: "Usuario registrado con éxito", username: newUser.username });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Error del servidor");
  }
};

// === Controlador per iniciar sessió ===
const login = async (req, res) => {
  // 👇 1. CANVIA 'username' PER 'email'
  const { email, password } = req.body;
  try {
    // 👇 2. BUSCA PER 'email'
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res
        .status(400)
        .json({ msg: "Credencials invàlides (email no trobat)" });
    }

    // Comprovem la contrasenya
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ msg: "Credencials invàlides (contrasenya incorrecta)" });
    }

    // Simplemente confirmamos el inicio de sesión y devolvemos el nombre de usuario
    res.json({ msg: "Inicio de sesión exitoso", username: user.username });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Error del servidor");
  }
};

module.exports = {
  register,
  login,
};
