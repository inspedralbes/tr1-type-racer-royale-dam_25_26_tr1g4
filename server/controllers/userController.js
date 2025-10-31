const User = require("../models/user");
const bcrypt = require("bcryptjs");

// === Controlador per registrar un nou usuari ===
const register = async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ msg: "Si us plau, inclou usuari, email i contrasenya" });
  }

  try {
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ msg: "L'email ja existeix" });
    }

    const newUser = await User.create({
      username: username,
      email: email,
      password: password,
    });

    res.status(201).json({ msg: "Usuario registrado con éxito", userId: newUser });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Error del servidor");
  }
};

// === Controlador per iniciar sessió ===
const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findByEmail(email);
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
