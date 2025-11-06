const express = require("express");
const cors = require("cors");
const { WebSocketServer } = require("ws");
const db = require("./config/database");
const createTables = require("./config/tables");
const userRoutes = require("./routes/userRoutes");
const { checkGlobalRecord } = require("./ws/gameSocket"); // Ruta al teu mòdul de BD

const app = express();

const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
};
app.use(cors(corsOptions));
app.use(express.json());
app.use("/api", require("./routes/api"));

const connectedClients = new Map();
const MAX_PLAYERS_PER_ROOM = 4;
let wss; // Define wss in a broader scope
const rooms = {}; // Store active game rooms

function broadcastToRoom(roomId, message) {
  const room = rooms[roomId];
  if (!room || !room.players) return;

  const messageString = JSON.stringify(message);

  room.players.forEach((p) => {
    if (p.ws.readyState === p.ws.OPEN) {
      p.ws.send(messageString);
    }
  });
}

// 🚨 FUNCIÓ DE LEADERBOARD (Utilitza l'estructura rooms={})
function broadcastLeaderboard(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  const leaderboardArray = room.players.map((p) => ({
    username: p.username,
    reps: p.reps || 0,
  }));

  leaderboardArray.sort((a, b) => b.reps - a.reps);

  const leaderboardMessage = {
    action: "leaderboard_update",
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
    action: "competition_ended",
    payload: {
      winnerUsername: winner.username,
      winnerReps: winner.reps,
      finalLeaderboard: participantArray.map((p) => ({
        username: p.username,
        reps: p.reps || 0,
      })),
    },
  };

  broadcastToRoom(roomId, victoryMessage);
  console.log(
    `🎉 COMPETICIÓ ACABADA a la sala ${roomId}. Guanyador: ${winner.username}`
  );

  // Neteja de la sala un cop acabada la competició
  delete rooms[roomId];
}

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getRoomClients(roomId) {
  return connectedClients.get(roomId) || new Set();
}

function get_public_rooms() {
  try {
    const publicRooms = Object.values(rooms)
      .filter((room) => room.isPublic && room.status === "waiting")
      .map((room) => ({
        id: room.id,
        exercise: room.exercise,
        jugadores: room.players.length,
        maxJugadores: MAX_PLAYERS_PER_ROOM,
      }));

    const message = {
      action: "public_rooms_list",
      payload: publicRooms,
    };

    wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  } catch (error) {
    console.error("Error al obtener las salas públicas:", error);
  }
}

function initWebSocket(server) {
  wss = new WebSocketServer({ server }); // Assign to the broader scope wss

  console.log(
    "Servidor de WebSockets activo y escuchando en el mismo puerto que Express."
  );

  wss.on("connection", (ws, req) => {
    const urlParams = new URLSearchParams(req.url.slice(1));

    const username = urlParams.get("username");

    if (!username) {
      ws.close(1008, "Nombre de usuario no proporcionado");

      return;
    }

    ws.username = username;

    console.log(`Cliente conectado: ${ws.username}`);

    ws.on("message", async (message) => {
      let data;

      try {
        data = JSON.parse(message);
      } catch (error) {
        console.error("Error al parsear mensaje:", message);

        return;
      }

      const { action, payload } = data;

      switch (action) {
        case "create_room": {
          const roomCode = generateRoomId();

          const roomId = roomCode;

          const ownerUsername = ws.username;

          rooms[roomId] = {
            id: roomId,

            owner: ownerUsername,

            players: [{ ws, username: ownerUsername, reps: 0, ready: true }],

            isPublic: false,

            status: "waiting",

            maxPlayers: MAX_PLAYERS_PER_ROOM,
          };

          ws.roomId = roomId;

          if (!connectedClients.has(roomId)) {
            connectedClients.set(roomId, new Set());
          }

          connectedClients.get(roomId).add(ws);

          const roomStatePayload = {
            roomId: roomId,

            owner: ownerUsername,

            players: rooms[roomId].players.map((p) => ({
              username: p.username,
              ready: p.ready,
            })),

            maxPlayers: MAX_PLAYERS_PER_ROOM,
          };

          ws.send(
            JSON.stringify({
              action: "room_created",

              payload: roomStatePayload,
            })
          );

          console.log(`Sala privada ${roomCode} creada por ${ownerUsername}`);

          break;
        }

        case "create_public_room": {
          const { exercise_text } = payload;

          if (!exercise_text) {
            ws.send(
              JSON.stringify({
                action: "error",
                payload: { message: "El texto del ejercicio es obligatorio." },
              })
            );

            return;
          }

          const roomCode = generateRoomId();

          const roomId = roomCode;

          const ownerUsername = ws.username;

          rooms[roomId] = {
            id: roomId,

            owner: ownerUsername,

            players: [{ ws, username: ownerUsername, reps: 0, ready: true }],

            isPublic: true,

            exercise: exercise_text,

            status: "waiting",

            maxPlayers: MAX_PLAYERS_PER_ROOM,
          };

          ws.roomId = roomId;

          if (!connectedClients.has(roomId)) {
            connectedClients.set(roomId, new Set());
          }

          connectedClients.get(roomId).add(ws);

          const roomStatePayload = {
            roomId: roomId,

            owner: ownerUsername,

            players: rooms[roomId].players.map((p) => ({
              username: p.username,
              ready: p.ready,
            })),

            maxPlayers: MAX_PLAYERS_PER_ROOM,
          };

          ws.send(
            JSON.stringify({
              action: "room_created",

              payload: roomStatePayload,
            })
          );

          console.log(`Sala pública ${roomCode} creada por ${ownerUsername}`);

          get_public_rooms();

          break;
        }

        case "get_public_rooms": {
          get_public_rooms();

          break;
        }

        case "join_room": {
          const { roomId: roomCode } = payload;

          const room = rooms[roomCode];

          if (!room) {
            ws.send(
              JSON.stringify({
                action: "error",
                payload: { message: "La sala no existe." },
              })
            );

            return;
          }

          if (room.players.length >= MAX_PLAYERS_PER_ROOM) {
            ws.send(
              JSON.stringify({
                action: "error",
                payload: { message: "La sala está llena." },
              })
            );

            return;
          }

          room.players.push({
            ws,
            username: ws.username,
            reps: 0,
            ready: false,
          });

          ws.roomId = roomCode;

          if (!connectedClients.has(roomCode)) {
            connectedClients.set(roomCode, new Set());
          }

          connectedClients.get(roomCode).add(ws);

          const playersInfo = room.players.map((p) => ({
            username: p.username,
            ready: p.ready,
          }));

          const roomStatePayload = {
            roomId: roomCode,

            owner: room.owner,

            players: playersInfo,

            maxPlayers: MAX_PLAYERS_PER_ROOM,
          };

          ws.send(
            JSON.stringify({
              action: "join_success",
              payload: roomStatePayload,
            })
          );

          broadcastToRoom(roomCode, {
            action: "player_joined",
            payload: roomStatePayload,
          });

          console.log(
            `Jugador ${
              ws.username
            } unido a la sala ${roomCode}. Jugadores: [${playersInfo
              .map((p) => p.username)
              .join(", ")}]`
          );

          if (room.players.length === MAX_PLAYERS_PER_ROOM) {
            broadcastToRoom(roomCode, {
              action: "room_full",
              payload: { roomId: roomCode },
            });

            console.log(`Sala ${roomCode} llena. Notificando a los jugadores.`);
          }

          break;
        }

        case "player_ready": {
          const { roomId } = payload;

          const room = rooms[roomId];

          const player = room ? room.players.find((p) => p.ws === ws) : null;

          if (player) {
            player.ready = !player.ready; // Toggle ready status

            const playersInfo = room.players.map((p) => ({
              username: p.username,
              ready: p.ready,
            }));

            const roomStatePayload = {
              roomId: roomId,

              owner: room.owner,

              players: playersInfo,

              maxPlayers: room.maxPlayers,
            };

            broadcastToRoom(roomId, {
              action: "players_ready_update",
              payload: roomStatePayload,
            });
          }

          break;
        }

        case "start_game": {
          const { roomId } = payload;

          const room = rooms[roomId];

          if (room && room.owner === ws.username) {
            const allReady = room.players.every((p) => p.ready);

            if (allReady && room.players.length > 0) {
              room.status = "playing";

              broadcastToRoom(roomId, { action: "game_starting" });

              console.log(
                `Game starting in room ${roomId} by owner ${ws.username}`
              );

              if (room.isPublic) {
                get_public_rooms();
              }
            } else {
              ws.send(
                JSON.stringify({
                  action: "error",
                  payload: { message: "No todos los jugadores están listos." },
                })
              );
            }
          }

          break;
        }

        case "update_reps": {
          const { roomId, reps, userId } = payload;

          const room = rooms[roomId];

          if (room && room.players && typeof reps === "number" && userId) {
            const player = room.players.find((p) => p.ws === ws);

            if (player) {
              player.reps = reps;

              checkGlobalRecord(ws, userId, player.username, reps);

              broadcastLeaderboard(roomId);
            }
          } else {
            console.warn(
              `Dades invàlides per a update_reps. RoomId: ${roomId}, UserId: ${userId}`
            );
          }

          break;
        }

        case "end_competition": {
          const { roomId } = payload;

          processCompetitionEnd(roomId);

          break;
        }
      }
    });

    ws.on("close", () => {
      console.log(`Cliente ${ws.username || "(anónimo)"} desconectado`);

      const roomId = ws.roomId;

      if (roomId && rooms[roomId]) {
        const room = rooms[roomId];

        const wasPublic = room.isPublic;

        const playerIndex = room.players.findIndex((p) => p.ws === ws);

        if (playerIndex !== -1) {
          room.players.splice(playerIndex, 1);

          if (room.players.length === 0) {
            delete rooms[roomId];

            console.log(`Sala ${roomId} eliminada por estar vacía.`);

            if (wasPublic) {
              get_public_rooms();
            }
          } else {
            // If the owner leaves, assign a new owner

            if (room.owner === ws.username) {
              room.owner = room.players[0].username;

              console.log(
                `El propietario ha cambiado a ${room.owner} en la sala ${roomId}`
              );
            }

            const playersInfo = room.players.map((p) => ({
              username: p.username,
              ready: p.ready,
            }));

            const playerLeftPayload = {
              roomId: roomId,

              owner: room.owner,

              players: playersInfo,

              maxPlayers: MAX_PLAYERS_PER_ROOM,
            };

            broadcastToRoom(roomId, {
              action: "player_left",
              payload: playerLeftPayload,
            });

            console.log(
              `Jugador ${
                ws.username
              } ha salido de la sala ${roomId}. Jugadores: [${playersInfo
                .map((p) => p.username)
                .join(", ")}]`
            );

            if (wasPublic) {
              get_public_rooms();
            }
          }
        }
      }

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
      console.log(
        `Servidor Express escoltant al port http://localhost:${PORT}`
      );
    });
    initWebSocket(server);
  } catch (err) {
    console.error("Error de connexió a MySQL:", err);
    process.exit(1);
  }
}

app.use("/api/users", userRoutes);

startServer();
