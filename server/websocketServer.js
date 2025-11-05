import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8081 });

console.log("Servidor de WebSockets iniciado en el puerto 8081");

// --- Base de Datos (Simulada en Memoria) ---
// En una aplicación real, esto estaría en una base de datos como MongoDB, PostgreSQL, etc.
const rooms = {};

const MAX_PLAYERS_PER_ROOM = 4;

function generateRoomId() {
    // Genera un ID de 6 caracteres alfanuméricos
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

wss.on('connection', (ws, req) => {
    // req.url contiene los parámetros de la URL, por ejemplo: /?username=JohnDoe
    const urlParams = new URLSearchParams(req.url.slice(1));
    const username = urlParams.get('username');

    // --- Lógica de "Autenticación" por nombre de usuario ---
    if (!username) {
        console.log('Conexión rechazada: No se proporcionó nombre de usuario.');
        ws.close(1008, "Nombre de usuario no proporcionado"); // 1008 = Policy Violation
        return;
    }

    // Asociamos el nombre de usuario a la conexión del WebSocket
    ws.username = username;
    console.log(`Cliente conectado: ${ws.username}`);

    ws.on('message', message => {
        let data;
        try {
            data = JSON.parse(message);
            console.log('Mensaje recibido:', data);
        } catch (error) {
            console.error('Error al parsear mensaje:', message);
            return;
        }

        const { action, payload } = data;

        switch (action) {
            case 'create_room':
                {
                    const roomId = generateRoomId();
                    rooms[roomId] = {
                        id: roomId,
                        players: [{ ws: ws, username: ws.username }], // El creador es el primer jugador
                        // Aquí podrías añadir más datos como nombre de la sala, si es pública, etc.
                    };
                    ws.roomId = roomId; // Asociamos la sala al cliente

                    // Enviamos al creador la confirmación
                    ws.send(JSON.stringify({
                        action: 'room_created',
                        payload: { roomId }
                    }));
                    console.log(`Sala ${roomId} creada por ${ws.username}`);
                    break;
                }

            case 'join_room':
                {
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

                    // Añadir jugador a la sala
                    room.players.push({ ws: ws, username: ws.username });
                    ws.roomId = roomId; // Asociar sala al nuevo cliente

                    const playerUsernames = room.players.map(p => p.username);
                    console.log(`Jugador ${ws.username} unido a la sala ${roomId}. Jugadores: [${playerUsernames.join(', ')}]`);

                    // Notificar al jugador que se ha unido
                    ws.send(JSON.stringify({
                        action: 'join_success',
                        payload: { 
                            roomId,
                            players: playerUsernames,
                            maxPlayers: MAX_PLAYERS_PER_ROOM
                        }
                    }));

                    // Notificar a los otros jugadores de la sala sobre el nuevo integrante
                    const messageToBroadcast = JSON.stringify({
                        action: 'player_joined',
                        payload: {
                            roomId,
                            players: playerUsernames,
                            maxPlayers: MAX_PLAYERS_PER_ROOM
                        }
                    });

                    room.players.forEach(p => {
                        if (p.ws !== ws && p.ws.readyState === p.ws.OPEN) {
                            p.ws.send(messageToBroadcast);
                        }
                    });

                    // Si la sala se llena, notificamos a todos para empezar
                    if (room.players.length === MAX_PLAYERS_PER_ROOM) {
                         const roomFullMessage = JSON.stringify({
                            action: 'room_full',
                            payload: { roomId }
                        });
                        room.players.forEach(p => {
                            if (p.ws.readyState === p.ws.OPEN) {
                                p.ws.send(roomFullMessage);
                            }
                        });
                        console.log(`Sala ${roomId} llena. Notificando a los jugadores.`);
                    }
                    break;
                }
        }
    });

    ws.on('close', () => {
        console.log(`Cliente ${ws.username || '(anónimo)'} desconectado`);
        const roomId = ws.roomId;
        if (roomId && rooms[roomId]) {
            // Eliminar al jugador de la sala
            rooms[roomId].players = rooms[roomId].players.filter(p => p.ws !== ws);
            console.log(`Jugador eliminado de la sala ${roomId}. Jugadores restantes: ${rooms[roomId].players.length}`);

            // Si la sala queda vacía, la eliminamos
            if (rooms[roomId].players.length === 0) {
                delete rooms[roomId];
                console.log(`Sala ${roomId} eliminada por estar vacía.`);
            }
        }
    });
});