const express = require('express');
const router = express.Router();

const db = require('../config/database'); 

// Ruta per obtenir els millors resultats històrics
router.get('/leaderboard/global', async (req, res) => { //ruta api
    const sql = `
        SELECT 
            u.id AS user_id,
            u.username,
            MAX(rg.repeticions_totals) AS max_reps
        FROM 
            resultats_globals rg
        JOIN users u ON u.id = rg.user_id
        GROUP BY 
            u.id, u.username
        ORDER BY 
            max_reps DESC
        LIMIT 10; -- Els 10 millors
    `;
    
    try {
        // La consulta obté la màxima repetició de cada usuari
        const [rows] = await db.execute(sql); 
        
        res.json({ 
            success: true, 
            leaderboard: rows 
        });

    } catch (error) {
        console.error('Error carregant el leaderboard global de MySQL:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error del servidor en accedir a la BD.' 
        });
    }
});

module.exports = router;
// ⚠️ Recorda fer app.use('/api', require('./routes/api')); al teu servidor principal.

// Ruta per obtenir tots els exercicis (id, name, tren)
router.get('/exercises', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT id, name, tren FROM exercises ORDER BY name');
        res.json({ success: true, exercises: rows });
    } catch (error) {
        console.error('Error carregant exercicis:', error);
        res.status(500).json({ success: false, message: 'Error del servidor en accedir a la BD.' });
    }
});