// routes/userRoutes.js

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Funció utilitària per generar el token
const generateToken = (id) => {
    const secret = 'nfhfuisisfnsfsofjoJPO'; 
    return jwt.sign({ id }, secret, {
        expiresIn: '1d', 
    });
};

router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validació simple
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Si us plau, omple tots els camps.' });
        }
        
        // Xifrat de la Contrasenya (Hashing)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Creació de l'Usuari
        const user = await User.create({
            username,
            email,
            password: hashedPassword,
        });

        // Resposta amb Token
        res.status(201).json({
            _id: user._id,
            username: user.username,
            token: generateToken(user._id),
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'L\'usuari o el correu electrònic ja existeix.' });
        }
        res.status(500).json({ message: 'Error en el registre', error: error.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        //Trobar l'usuari
        const user = await User.findOne({ email }).select('+password');

        //Comprovar usuari i contrasenya
        if (user && (await bcrypt.compare(password, user.password))) {
            res.json({
                _id: user._id,
                username: user.username,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Credencials no vàlides.' });
        }

    } catch (error) {
        res.status(500).json({ message: 'Error en el login', error: error.message });
    }
});


module.exports = router;