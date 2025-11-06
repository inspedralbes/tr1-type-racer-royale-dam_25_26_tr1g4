
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const db = require('./config/database');
const createTables = require('./config/tables');
const userRoutes = require('./routes/userRoutes');
const { checkGlobalRecord } = require('./ws/gameSocket'); // Ruta al teu mòdul de BD

const app = express();

const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
};
app.use(cors(corsOptions));
app.use(express.json());
app.use('/api', require('./routes/api'));

const connectedClients = new Map();
const MAX_PLAYERS_PER_ROOM = 4;
let wss; // Define wss in a broader scope
const rooms = {}; // Store active game rooms

function broadcastToRoom(roomId, message) {
    const room = rooms[roomId];
    if (!room || !room.players) return;

    const messageString = JSON.stringify(message);

    room.players.forEach(p => {
        if (p.ws.readyState === p.ws.OPEN) {
            p.ws.send(messageString);
        }
    });
}

// 🚨 FUNCIÓ DE LEADERBOARD (Utilitza l'estructura rooms={})
function broadcastLeaderboard(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    const leaderboardArray = room.players.map(p => ({
        username: p.username,
        reps: p.reps || 0,
    }));
    
    leaderboardArray.sort((a, b) => b.reps - a.reps);

    const leaderboardMessage = {
        action: 'leaderboard_update',
        payload: leaderboardArray,
    };
    broadcastToRoom(roomId, leaderboardMessage);
}

async function processCompetitionEnd(roomId) { 
    const room = rooms[roomId];
    if (!room) return;

    const participantArray = room.players; 
    
    if (participantArray.length === 0) return;

    participantArray.sort((a, b) => (b.reps || 0) - (a.reps || 0)); 
    const winner = participantArray[0];
    
    const victoryMessage = {
        action: 'competition_ended',
        payload: {
            winnerUsername: winner.username,
            winnerReps: winner.reps,
            finalLeaderboard: participantArray.map(p => ({
                username: p.username,
                reps: p.reps || 0,
            })),
        },
    };

    broadcastToRoom(roomId, victoryMessage); 
    console.log(`🎉 COMPETICIÓ ACABADA a la sala ${roomId}. Guanyador: ${winner.username}`);
    
    // Neteja de la sala un cop acabada la competició
    delete rooms[roomId]; 
}

function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getRoomClients(roomId) {
    return connectedClients.get(roomId) || new Set();
}

async function get_public_rooms(ws) {
    try {
        const [rooms] = await db.execute(
            `SELECT s.room_code, s.exercise_text, COUNT(p.id) as num_players
             FROM sessions s
             LEFT JOIN performances p ON s.id = p.sessio_id
             WHERE s.is_public = TRUE AND s.status = 'waiting'
             GROUP BY s.id`
        );

        const publicRooms = rooms.map(room => ({
            id: room.room_code,
            exercise: room.exercise_text,
            jugadores: room.num_players,
            maxJugadores: MAX_PLAYERS_PER_ROOM
        }));

        wss.clients.forEach(client => {
            if (client.readyState === client.OPEN) {
                client.send(JSON.stringify({
                    action: 'public_rooms_list',
                    payload: publicRooms
                }));
            }
        });
    } catch (error) {
        console.error('Error al obtener las salas públicas:', error);
        if (ws) {
            ws.send(JSON.stringify({ action: 'error', payload: { message: 'Error al obtener las salas públicas.' } }));
        }
    }
}

function initWebSocket(server) {
    wss = new WebSocketServer({ server }); // Assign to the broader scope wss
    console.log('Servidor de WebSockets activo y escuchando en el mismo puerto que Express.');

    wss.on('connection', (ws, req) => {
        const urlParams = new URLSearchParams(req.url.slice(1));
        const username = urlParams.get('username');

        if (!username) {
            ws.close(1008, "Nombre de usuario no proporcionado");
            return;
        }

        ws.username = username;
        console.log(`Cliente conectado: ${ws.username}`);

        ws.on('message', async message => {
            let data;
            try {
                data = JSON.parse(message);
            } catch (error) {
                console.error('Error al parsear mensaje:', message);
                return;
            }

            const { action, payload } = data;

            switch (action) {
                case 'create_room': {
                    try {
                        const roomCode = generateRoomId();
                        const roomId = roomCode;  // For private rooms, we use the generated code as the ID
                        rooms[roomId] = {
                            id: roomId,
                            players: [{ ws, username: ws.username, reps: 0}],
                        };
                        ws.roomId = roomId;

                        if (!connectedClients.has(roomId)) {
                            connectedClients.set(roomId, new Set());
                        }
                        connectedClients.get(roomId).add(ws);

                        await db.execute(
                            'INSERT INTO performances (user_id, sessio_id, won) VALUES ((SELECT id FROM users WHERE username = ?), ?, ?)',
                            [ws.username, roomId, false]
                        );

                        ws.send(JSON.stringify({
                            action: 'room_created',
                            payload: { roomId: roomCode }
                        }));
                        console.log(`Sala privada ${roomCode} (ID: ${roomId}) creada por ${ws.username}`);
                    } catch (error) {
                        console.error('Error al crear la sala privada:', error);
                        ws.send(JSON.stringify({ action: 'error', payload: { message: 'Error al crear la sala privada.' } }));
                    }
                    break;
                }

                case 'create_public_room': {
                    const { exercise_text } = payload;
                    if (!exercise_text) {
                        ws.send(JSON.stringify({ action: 'error', payload: { message: 'El texto del ejercicio es obligatorio.' } }));
                        return;
                    }
                    const roomCode = generateRoomId();
                    try {
                        const [result] = await db.execute(
                            'INSERT INTO sessions (room_code, is_public, exercise_text, status) VALUES (?, ?, ?, ?)',
                            [roomCode, true, exercise_text, 'waiting']
                        );
                        const roomId = result.insertId;
                        ws.roomId = roomId;

                        if (!connectedClients.has(roomId)) {
                            connectedClients.set(roomId, new Set());
                        }
                        connectedClients.get(roomId).add(ws);
                        
                        await db.execute(
                            'INSERT INTO performances (user_id, sessio_id, won) VALUES ((SELECT id FROM users WHERE username = ?), ?, ?)',
                            [ws.username, roomId, false]
                        );

                        ws.send(JSON.stringify({
                            action: 'room_created',
                            payload: { roomId: roomCode }
                        }));
                        console.log(`Sala pública ${roomCode} (ID: ${roomId}) creada por ${ws.username}`);
                        
                        await get_public_rooms(ws);

                    } catch (error) {
                        console.error('Error al crear la sala pública:', error);
                        ws.send(JSON.stringify({ action: 'error', payload: { message: 'Error al crear la sala pública.' } }));
                    }
                    break;
                }

                case 'get_public_rooms': {
                    await get_public_rooms(ws);
                    break;
                }

                case 'join_room': {
                    const { roomId: roomCode } = payload;
                    try {
                        const [rows] = await db.execute('SELECT id, status FROM sessions WHERE room_code = ?', [roomCode]);
                        if (rows.length === 0) {
                            ws.send(JSON.stringify({ action: 'error', payload: { message: 'La sala no existe.' } }));
                            return;
                        }
                        const room = rows[0];
                        const roomId = room.id;

                        const [performances] = await db.execute('SELECT * FROM performances WHERE sessio_id = ?', [roomId]);

                        if (performances.length >= MAX_PLAYERS_PER_ROOM) {
                            ws.send(JSON.stringify({ action: 'error', payload: { message: 'La sala está llena.' } }));
                            return;
                        }

                    // Initialize room in memory if it doesn't exist
                    if (!rooms[roomId]) {
                        rooms[roomId] = {
                            id: roomId,
                            players: []
                        };
                    }
                    
                    rooms[roomId].players.push({ ws, username: ws.username, reps: 0 });
                    ws.roomId = roomId;

                    if (!connectedClients.has(roomId)) {
                        connectedClients.set(roomId, new Set());
                    }
                    connectedClients.get(roomId).add(ws);

                    await db.execute(
                        'INSERT INTO performances (user_id, sessio_id, won) VALUES ((SELECT id FROM users WHERE username = ?), ?, ?)',
                        [ws.username, roomId, false]
                    );

                        const [updatedPerformances] = await db.execute(
                            'SELECT u.username FROM performances p JOIN users u ON p.user_id = u.id WHERE p.sessio_id = ?',
                            [roomId]
                        );
                        const playerUsernames = updatedPerformances.map(p => p.username);

                        const joinSuccessPayload = {
                            roomId: roomCode,
                            players: playerUsernames,
                            maxPlayers: MAX_PLAYERS_PER_ROOM
                        };

                        ws.send(JSON.stringify({ action: 'join_success', payload: joinSuccessPayload }));

                        broadcastToRoom(roomId, { action: 'player_joined', payload: joinSuccessPayload }, ws);

                        console.log(`Jugador ${ws.username} unido a la sala ${roomCode}. Jugadores: [${playerUsernames.join(', ')}]`);

                        if (playerUsernames.length === MAX_PLAYERS_PER_ROOM) {
                            broadcastToRoom(roomId, { action: 'room_full', payload: { roomId: roomCode } });
                            console.log(`Sala ${roomCode} llena. Notificando a los jugadores.`);
                        }
                    } catch (error) {
                        console.error('Error al unirse a la sala:', error);
                        ws.send(JSON.stringify({ action: 'error', payload: { message: 'Error al unirse a la sala.' } }));
                    }
                    break;
                }
                case 'update_reps': {
               // 🚨 ASSUMIM QUE EL CLIENT ENVIA: { action: 'update_reps', payload: { roomId: 'ABC', reps: 10, userId: '123' } }
               const { roomId, reps, userId } = payload; 
               const room = rooms[roomId];

               if (room && room.players && typeof reps === 'number' && userId) {
               const player = room.players.find(p => p.ws === ws);
        
        if (player) {
            player.reps = reps;
            
            // 🚨 CRIDA A LA FUNCIÓ DE PERSISTÈNCIA DE BD
            checkGlobalRecord(ws, userId, player.username, reps);
            
            // Actualitza el Leaderboard de la sala
            broadcastLeaderboard(roomId);
        }
    } else {
        console.warn(`Dades invàlides per a update_reps. RoomId: ${roomId}, UserId: ${userId}`);
    }
    break;
}
case 'end_competition': {
    const { roomId } = payload;
    
    // 🚨 CRIDA A LA FUNCIÓ DE FI DE JOC ADAPTADA
    processCompetitionEnd(roomId);
    
    // La funció processCompetitionEnd ja elimina la sala (delete rooms[roomId])
    
    break;
}
            }
        });

        ws.on('close', () => {
            console.log(`Cliente ${ws.username || '(anónimo)'} desconectado`);
            const roomId = ws.roomId;
            if (roomId && connectedClients.has(roomId)) {
                connectedClients.get(roomId).delete(ws);
                if (connectedClients.get(roomId).size === 0) {
                    connectedClients.delete(roomId);
                }
            }
        });
    });
}

async function startServer() {
    try {
        await createTables();
        const PORT = 7001;
        const server = app.listen(PORT, () => {
            console.log(`Servidor Express escoltant al port http://localhost:${PORT}`);
        });
        initWebSocket(server);
    } catch (err) {
        console.error('Error de connexió a MySQL:', err);
        process.exit(1);
    }
}

app.use('/api/users', userRoutes);

startServer();
