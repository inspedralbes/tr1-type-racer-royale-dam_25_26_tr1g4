
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws'); // Importamos el servidor de WebSocket

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

const rooms = {};
const MAX_PLAYERS_PER_ROOM = 4;

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

function initWebSocket(server) {
    const wss = new WebSocketServer({ server });
    console.log('Servidor de WebSockets activo y escuchando en el mismo puerto que Express.');

    wss.on('connection', (ws, req) => {
        const urlParams = new URLSearchParams(req.url.slice(1));
        const username = urlParams.get('username');

        if (!username) {
            console.log('Conexión rechazada: No se proporcionó nombre de usuario.');
            ws.close(1008, "Nombre de usuario no proporcionado");
            return;
        }

        ws.username = username;
        console.log(`Cliente conectado: ${ws.username}`);

        ws.on('message', message => {
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
                    const roomId = generateRoomId();
                    rooms[roomId] = {
                        id: roomId,
                        players: [{ ws, username: ws.username, reps: 0}],
                    };
                    ws.roomId = roomId;

                    ws.send(JSON.stringify({ action: 'room_created', payload: { roomId } }));
                    console.log(`Sala ${roomId} creada por ${ws.username}`);
                    break;
                }

                case 'join_room': {
                    const { roomId } = payload;
                    const room = rooms[roomId];

                    if (!room) {
                        ws.send(JSON.stringify({ action: 'error', payload: { message: 'La sala no existe.' } }));
                        return;
                    }

                    if (room.players.length >= MAX_PLAYERS_PER_ROOM) {
                        ws.send(JSON.stringify({ action: 'error', payload: { message: 'La sala está llena.' } }));
                        return;
                    }

                    room.players.push({ ws, username: ws.username, reps: 0 });
                    ws.roomId = roomId;

                    const playerUsernames = room.players.map(p => p.username);
                    console.log(`Jugador ${ws.username} unido a la sala ${roomId}. Jugadores: [${playerUsernames.join(', ')}]`);

                    const messageToBroadcast = JSON.stringify({
                        action: 'player_joined',
                        payload: { roomId, players: playerUsernames, maxPlayers: MAX_PLAYERS_PER_ROOM }
                    });

                    room.players.forEach(p => {
                        if (p.ws.readyState === p.ws.OPEN) p.ws.send(messageToBroadcast);
                    });

                    if (room.players.length === MAX_PLAYERS_PER_ROOM) {
                        const roomFullMessage = JSON.stringify({ action: 'room_full', payload: { roomId } });
                        room.players.forEach(p => {
                            if (p.ws.readyState === p.ws.OPEN) p.ws.send(roomFullMessage);
                        });
                        console.log(`Sala ${roomId} llena. Notificando a los jugadores.`);
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
            // Aquí iría la lógica para eliminar al jugador de la sala si estuviera en una.
        });
    });
}

async function startServer() {  
  try {
    await createTables();
    const PORT =  7001;
    const server = app.listen(PORT, () => {
      console.log(` Servidor Express escoltant al port http://localhost:${PORT}`);
    });
    initWebSocket(server); // Iniciamos el WebSocket en el mismo servidor

  } catch (err) {
    console.error(' Error de connexió a MySQL:', err);
    process.exit(1);
  }
}

app.use('/api/users', userRoutes);

startServer();