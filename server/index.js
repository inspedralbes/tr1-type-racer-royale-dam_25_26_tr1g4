require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { WebSocketServer } = require("ws");
const db = require("./config/database");
const userRoutes = require("./routes/userRoutes");
const fs = require("fs").promises;
const path = require("path");
const { User } = require("./models/sequelize"); // --- CAMBIO --- Importamos el modelo User

const CHAT_LOG_DIR = path.join(__dirname, "chats");

async function logChatMessage(roomId, messageData) {
  try {
    // Ensure the chat log directory exists
    await fs.mkdir(CHAT_LOG_DIR, { recursive: true });

    const logFile = path.join(CHAT_LOG_DIR, `${roomId}.json`);
    let logs = [];

    try {
      // Try to read existing logs
      const data = await fs.readFile(logFile, "utf8");
      logs = JSON.parse(data);
    } catch (error) {
      // If file doesn't exist, it's fine, we'll create it.
      if (error.code !== "ENOENT") {
        throw error; // Rethrow other errors
      }
    }

    // Add the new message
    logs.push(messageData);

    // Write the updated logs back to the file
    await fs.writeFile(logFile, JSON.stringify(logs, null, 2), "utf8");
  } catch (error) {
    console.error(`Error logging chat message for room ${roomId}:`, error);
  }
}

const app = express();

const corsOptions = {
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
};

const nodeEnv = process.env.NODE_ENV;

// En producción, solo permite peticiones desde la URL del frontend definida en .env
if (nodeEnv === "production") {
  console.log("Running in production mode");
  if (process.env.FRONTEND_URL) {
    corsOptions.origin = process.env.FRONTEND_URL;
  } else {
    console.error(
      "ERROR: FRONTEND_URL is not set in the production environment. CORS will be restricted."
    );
    corsOptions.origin = false; // Disallow all origins if not set
  }
} else {
  console.log("Running in development mode");
  // En desarrollo, permite cualquier origen
  corsOptions.origin = "*";
}

app.use(cors(corsOptions));
app.use(express.json());
app.use("/api/users", userRoutes);
app.use("/api/stats", require("./routes/statsRoutes"));
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

/**
 * 1. 💾 Guarda un resultat a la Base de Dades (INSERT MySQL2).
 */
async function saveResultToDatabase(userId, username, reps) {
  const sql = `
        INSERT INTO resultats_globals 
        (user_id, username, repeticions_totals) 
        VALUES (?, ?, ?)
    `;

  try {
    await db.execute(sql, [userId, username, reps]);
    console.log(`[BD] Resultat de ${username} (${reps} reps) guardat.`);
  } catch (err) {
    console.error("❌ Error guardant el resultat a MySQL:", err);
  }
}

/**
 * 2. 🔍 Comprova si les repeticions actuals superen el rècord històric de l'usuari.
 */
async function checkGlobalRecord(ws, userId, username, currentReps) {
  // Consulta: Obtenir la millor puntuació MAI aconseguida per aquest usuari
  const sql_check = `
        SELECT 
            MAX(repeticions_totals) AS best_reps 
        FROM 
            resultats_globals 
        WHERE 
            user_id = ?;
    `;

  try {
    const [rows] = await db.execute(sql_check, [userId]);
    const best_historic_reps = rows[0]?.best_reps || 0;

    if (currentReps > best_historic_reps) {
      // 🚨 S'ha batut un rècord!
      // Guardem el nou rècord immediatament
      await saveResultToDatabase(userId, username, currentReps);

      // Enviem un missatge d'èxit només a l'usuari que ha batut el rècord
      ws.send(
        JSON.stringify({
          type: "new_global_record",
          payload: {
            reps: currentReps,
            message: "🎉 ¡Nou rècord personal GLOBAL durant la partida!",
          },
        })
      );

      console.log(`[RÈCORD BATUT] ${username}: ${currentReps} reps.`);
    }
  } catch (err) {
    console.error("Error comprovant rècord global:", err);
  }
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

  console.log(
    "Final participants array:",
    JSON.stringify(
      participantArray.map((p) => ({ username: p.username, reps: p.reps })),
      null,
      2
    )
  );

  participantArray.sort((a, b) => (b.reps || 0) - (a.reps || 0));
  const winner = participantArray[0];

  const gameOverMessage = {
    action: "game_over",
    payload: {
      leaderboard: participantArray.map((p) => ({
        username: p.username,
        reps: p.reps || 0,
      })),
    },
  };

  broadcastToRoom(roomId, gameOverMessage);
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
  const createTables = require("./config/tables");
  wss = new WebSocketServer({ server }); // Assign to the broader scope wss

  console.log(
    "Servidor de WebSockets activo y escuchando en el mismo puerto que Express."
  );

  // --- CAMBIO --- Convertimos la conexión en 'async' para buscar al usuario
  wss.on("connection", async (ws, req) => {
    const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
    const username = searchParams.get("username");

    if (!username) {
      ws.close(1008, "Nombre de usuario no proporcionado");
      return;
    }

    // --- CAMBIO --- Añadimos bloque para buscar User y guardar 'ws.userId'
    try {
      const user = await User.findOne({ where: { username } });
      if (user) {
        ws.userId = user.id; // ¡Clave! Guardamos el ID del usuario
        ws.username = user.username;
        console.log(`Cliente conectado: ${ws.username} (ID: ${ws.userId})`);
      } else {
        console.log(`Usuari ${username} no trobat a la BD. Tancant connexió.`);
        ws.send(
          JSON.stringify({
            action: "error",
            payload: { message: "Usuario no encontrado" },
          })
        );
        ws.close(1008, "Usuario no encontrado");
        return;
      }
    } catch (error) {
      console.error("Error al buscar usuari:", error);
      ws.close(1008, "Error de base de datos");
      return;
    }
    // --- FIN DEL CAMBIO ---

    // --- CAMBIO --- Convertimos el 'message' handler en 'async' para esperar la BBDD
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

          // --- CAMBIO --- Añadimos la inserción en la BBDD
          try {
            const sql = `
              INSERT INTO routines (room_code, is_public, creator_id) 
              VALUES (?, ?, ?)
            `;
            await db.execute(sql, [roomId, false, ws.userId]); // false = privada
            console.log(
              `[DB] Sala privada ${roomId} creada en 'routines' por user ${ws.userId}.`
            );
          } catch (err) {
            console.error("Error creating room in DB:", err);
            ws.send(
              JSON.stringify({
                action: "error",
                payload: { message: "Error al crear la sala en la BD" },
              })
            );
            break; // Salimos del case si falla la BBDD
          }
          // --- FIN DEL CAMBIO ---

          rooms[roomId] = {
            id: roomId,
            owner: ownerUsername,
            players: [{ ws, username: ownerUsername, reps: 0, ready: true }],
            isPublic: false,
            status: "waiting",
            maxPlayers: MAX_PLAYERS_PER_ROOM,
            readyGamePlayers: new Set(),
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
          const roomCode = generateRoomId();
          const roomId = roomCode;
          const ownerUsername = ws.username;

          // --- CAMBIO --- Añadimos la inserción en la BBDD
          try {
            const sql = `
              INSERT INTO routines (room_code, is_public, creator_id) 
              VALUES (?, ?, ?)
            `;
            await db.execute(sql, [roomId, true, ws.userId]); // true = pública
            console.log(
              `[DB] Sala pública ${roomId} creada en 'routines' por user ${ws.userId}.`
            );
          } catch (err) {
            console.error("Error creating public room in DB:", err);
            ws.send(
              JSON.stringify({
                action: "error",
                payload: { message: "Error al crear la sala pública en la BD" },
              })
            );
            break; // Salimos del case si falla la BBDD
          }
          // --- FIN DEL CAMBIO ---

          rooms[roomId] = {
            id: roomId,
            owner: ownerUsername,
            players: [{ ws, username: ownerUsername, reps: 0, ready: true }],
            isPublic: true,
            exercise: exercise_text,
            status: "waiting",
            maxPlayers: MAX_PLAYERS_PER_ROOM,
            readyGamePlayers: new Set(),
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
          const { roomId, exerciseId } = payload;
          const room = rooms[roomId];

          if (room && room.owner === ws.username) {
            const allReady = room.players.every((p) => p.ready);

            if (allReady && room.players.length > 0) {
              room.status = "playing";
              broadcastToRoom(roomId, {
                action: "game_starting",
                payload: { exerciseId },
              });
              console.log(
                `Game starting in room ${roomId} by owner ${ws.username} with exercise ${exerciseId}`
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

        case "player_game_ready": {
          const { roomId } = payload;
          const room = rooms[roomId];
          const player = room ? room.players.find((p) => p.ws === ws) : null;

          if (player && room) {
            room.readyGamePlayers.add(ws.username);

            if (room.readyGamePlayers.size === room.players.length) {
              // All players are ready, start the sequence
              broadcastToRoom(roomId, { action: "all_players_ready" });

              setTimeout(() => {
                broadcastToRoom(roomId, { action: "start_game_countdown" });

                setTimeout(() => {
                  processCompetitionEnd(roomId); // This will send the 'game_over' message
                }, 60000); // 60 seconds
              }, 10000); // 10 seconds
            }
          }
          break;
        }

        case "update_reps": {
          const { roomId, reps, userId } = payload;
          const room = rooms[roomId];

          // --- CAMBIO --- Aseguramos que el userId que usamos es el de la BBDD (ws.userId)
          // en lugar del que viene del payload, que podría ser inseguro o incorrecto.
          if (
            room &&
            room.players &&
            typeof reps === "number" &&
            ws.userId // Comprobamos el 'ws.userId' que obtuvimos al conectar
          ) {
            const player = room.players.find((p) => p.ws === ws);

            if (player) {
              player.reps = reps;
              // Pasamos el 'ws.userId' seguro a checkGlobalRecord
              checkGlobalRecord(ws, ws.userId, player.username, reps);
              broadcastLeaderboard(roomId);
            }
          } else {
            console.warn(
              `Dades invàlides per a update_reps. RoomId: ${roomId}, UserId: ${ws.userId}`
            );
          }
          break;
        }

        case "end_competition": {
          const { roomId } = payload;
          processCompetitionEnd(roomId);
          break;
        }

        case "send_message": {
          try {
            console.log("Received send_message action with payload:", payload);
            const { roomId, text } = payload;
            const room = rooms[roomId];
            if (room) {
              const messagePayload = {
                username: ws.username,
                text: text,
              };
              const message = {
                action: "new_message",
                payload: messagePayload,
              };
              console.log(
                `Broadcasting new_message to room ${roomId}:`,
                message
              );
              broadcastToRoom(roomId, message);

              // Log the message to a file
              const logEntry = {
                ...messagePayload,
                timestamp: new Date().toISOString(),
              };
              await logChatMessage(roomId, logEntry);
            } else {
              console.log(`Room ${roomId} not found for send_message action.`);
            }
          } catch (e) {
            console.error("!!! ERROR IN send_message CASE !!!", e);
          }
          break;
        }

        case "leave_room": {
          const { roomId } = payload;
          if (roomId && rooms[roomId]) {
            const room = rooms[roomId];
            const wasPublic = room.isPublic;
            const playerIndex = room.players.findIndex((p) => p.ws === ws);

            if (playerIndex !== -1) {
              room.players.splice(playerIndex, 1);
              ws.roomId = null; // Clear the roomId for this ws connection

              if (room.players.length === 0) {
                delete rooms[roomId];
                console.log(`Sala ${roomId} eliminada por estar vacía.`);
                if (wasPublic) {
                  get_public_rooms();
                }
              } else {
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

async function connectWithRetry(retries = 5, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      await createTables();
      console.log("✅ Database tables created or already exist.");
      return; // Success
    } catch (err) {
      console.error(
        `❌ Error connecting to database (attempt ${i + 1}/${retries}):`,
        err.message
      );
      if (i < retries - 1) {
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise((res) => setTimeout(res, delay));
      } else {
        throw new Error(
          "❌ Could not connect to the database after multiple retries."
        );
      }
    }
  }
}

async function startServer() {
  try {
    await connectWithRetry();
    const PORT = 3000;
    const server = app.listen(PORT, () => {
      console.log(
        `Servidor Express escoltant al port http://localhost:${PORT}`
      );
    });
    initWebSocket(server);
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
}

startServer();
