import { WebSocketServer } from "ws";
import db from "./config/database.js";

const wss = new WebSocketServer({ port: 8081 });

console.log("Servidor de WebSockets iniciado en el puerto 8081");

const connectedClients = new Map();

const MAX_PLAYERS_PER_ROOM = 4;

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getRoomClients(roomId) {
  return connectedClients.get(roomId) || new Set();
}

function broadcastToRoom(roomId, message, excludeWs) {
  const clients = getRoomClients(roomId);
  for (const client of clients) {
    if (client !== excludeWs && client.readyState === client.OPEN) {
      client.send(JSON.stringify(message));
    }
  }
}

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
      console.log("Mensaje recibido:", data);
    } catch (error) {
      console.error("Error al parsear mensaje:", message);
      return;
    }

    const { action, payload } = data;

    switch (action) {
      case "create_room": {
        const roomCode = generateRoomId();
        try {
          const [result] = await db.execute(
            "INSERT INTO sessions (room_code, is_public, status) VALUES (?, ?, ?)",
            [roomCode, false, "waiting"]
          );
          const roomId = result.insertId;
          ws.roomId = roomId;

          if (!connectedClients.has(roomId)) {
            connectedClients.set(roomId, new Set());
          }
          connectedClients.get(roomId).add(ws);

          await db.execute(
            "INSERT INTO performances (user_id, sessio_id) VALUES ((SELECT id FROM users WHERE username = ?), ?)",
            [ws.username, roomId]
          );

          ws.send(
            JSON.stringify({
              action: "room_created",
              payload: { roomId: roomCode },
            })
          );
          console.log(
            `Sala privada ${roomCode} (ID: ${roomId}) creada por ${ws.username}`
          );
        } catch (error) {
          console.error("Error al crear la sala privada:", error);
          ws.send(
            JSON.stringify({
              action: "error",
              payload: { message: "Error al crear la sala privada." },
            })
          );
        }
        break;
      }

      case "create_public_room": {
        const { exercise_text } = payload; // Can be undefined
        const roomCode = generateRoomId();
        try {
          const [result] = await db.execute(
            "INSERT INTO sessions (room_code, is_public, exercise_text, status) VALUES (?, ?, ?, ?)",
            [roomCode, true, exercise_text || null, "waiting"]
          );
          const roomId = result.insertId;
          ws.roomId = roomId;

          if (!connectedClients.has(roomId)) {
            connectedClients.set(roomId, new Set());
          }
          connectedClients.get(roomId).add(ws);

          await db.execute(
            "INSERT INTO performances (user_id, sessio_id) VALUES ((SELECT id FROM users WHERE username = ?), ?)",
            [ws.username, roomId]
          );

          ws.send(
            JSON.stringify({
              action: "room_created",
              payload: { roomId: roomCode },
            })
          );
          console.log(
            `Sala pública ${roomCode} (ID: ${roomId}) creada por ${ws.username}`
          );

          // Notificar a todos de la nueva sala pública
          get_public_rooms(ws);
        } catch (error) {
          console.error("Error al crear la sala pública:", error);
          ws.send(
            JSON.stringify({
              action: "error",
              payload: { message: "Error al crear la sala pública." },
            })
          );
        }
        break;
      }

      case "get_public_rooms": {
        await get_public_rooms(ws);
        break;
      }

      case "join_room": {
        const { roomId: roomCode } = payload;
        try {
          const [rows] = await db.execute(
            "SELECT id, status FROM sessions WHERE room_code = ?",
            [roomCode]
          );
          if (rows.length === 0) {
            ws.send(
              JSON.stringify({
                action: "error",
                payload: { message: "La sala no existe." },
              })
            );
            return;
          }
          const room = rows[0];
          const roomId = room.id;

          const [performances] = await db.execute(
            "SELECT * FROM performances WHERE sessio_id = ?",
            [roomId]
          );

          if (performances.length >= MAX_PLAYERS_PER_ROOM) {
            ws.send(
              JSON.stringify({
                action: "error",
                payload: { message: "La sala está llena." },
              })
            );
            return;
          }

          ws.roomId = roomId;
          if (!connectedClients.has(roomId)) {
            connectedClients.set(roomId, new Set());
          }
          connectedClients.get(roomId).add(ws);

          await db.execute(
            "INSERT INTO performances (user_id, sessio_id) VALUES ((SELECT id FROM users WHERE username = ?), ?)",
            [ws.username, roomId]
          );

          const [updatedPerformances] = await db.execute(
            "SELECT u.username FROM performances p JOIN users u ON p.user_id = u.id WHERE p.sessio_id = ?",
            [roomId]
          );
          const playerUsernames = updatedPerformances.map((p) => p.username);

          const joinSuccessPayload = {
            roomId: roomCode,
            players: playerUsernames,
            maxPlayers: MAX_PLAYERS_PER_ROOM,
          };

          ws.send(
            JSON.stringify({
              action: "join_success",
              payload: joinSuccessPayload,
            })
          );

          broadcastToRoom(
            roomId,
            { action: "player_joined", payload: joinSuccessPayload },
            ws
          );

          console.log(
            `Jugador ${
              ws.username
            } unido a la sala ${roomCode}. Jugadores: [${playerUsernames.join(
              ", "
            )}]`
          );

          if (playerUsernames.length === MAX_PLAYERS_PER_ROOM) {
            broadcastToRoom(roomId, {
              action: "room_full",
              payload: { roomId: roomCode },
            });
            console.log(`Sala ${roomCode} llena. Notificando a los jugadores.`);
          }
        } catch (error) {
          console.error("Error al unirse a la sala:", error);
          ws.send(
            JSON.stringify({
              action: "error",
              payload: { message: "Error al unirse a la sala." },
            })
          );
        }
        break;
      }

      case "leave_room": {
        const { roomId: roomCodeFromClient } = payload;
        const currentRoomId = ws.roomId;

        if (!currentRoomId) {
          return;
        }

        try {
          const [roomRows] = await db.execute(
            "SELECT room_code FROM sessions WHERE id = ?",
            [currentRoomId]
          );
          if (
            roomRows.length === 0 ||
            roomRows[0].room_code !== roomCodeFromClient
          ) {
            console.error(
              `leave_room inconsistency: ws.roomId=${currentRoomId}, but client sent roomCode=${roomCodeFromClient}`
            );
          }

          await db.execute(
            "DELETE FROM performances WHERE user_id = (SELECT id FROM users WHERE username = ?) AND sessio_id = ?",
            [ws.username, currentRoomId]
          );

          if (connectedClients.has(currentRoomId)) {
            const roomClients = connectedClients.get(currentRoomId);
            roomClients.delete(ws);

            if (roomClients.size === 0) {
              connectedClients.delete(currentRoomId);
              console.log(
                `Room (ID: ${currentRoomId}) deleted from client map as it is empty.`
              );
              await db.execute("DELETE FROM sessions WHERE id = ?", [
                currentRoomId,
              ]);
              console.log(`Room (ID: ${currentRoomId}) deleted from database.`);
            } else {
              const [updatedPerformances] = await db.execute(
                "SELECT u.username FROM performances p JOIN users u ON p.user_id = u.id WHERE p.sessio_id = ?",
                [currentRoomId]
              );
              const playerUsernames = updatedPerformances.map(
                (p) => p.username
              );

              const playerLeftPayload = {
                roomId: roomCodeFromClient,
                players: playerUsernames,
                maxPlayers: MAX_PLAYERS_PER_ROOM,
              };
              broadcastToRoom(currentRoomId, {
                action: "player_left",
                payload: playerLeftPayload,
              });
              console.log(
                `Player ${
                  ws.username
                } left room ${roomCodeFromClient}. Remaining players: [${playerUsernames.join(
                  ", "
                )}]`
              );
            }
          }

          ws.roomId = null;

          await get_public_rooms();
        } catch (error) {
          console.error("Error processing leave_room:", error);
          ws.send(
            JSON.stringify({
              action: "error",
              payload: { message: "Error leaving room." },
            })
          );
        }
        break;
      }
    }
  });

  ws.on("close", async () => {
    console.log(`Cliente ${ws.username || "(anónimo)"} desconectado`);
    const roomId = ws.roomId;
    if (roomId) {
      try {
        await db.execute(
          "DELETE FROM performances WHERE user_id = (SELECT id FROM users WHERE username = ?) AND sessio_id = ?",
          [ws.username, roomId]
        );

        let roomCode = "";
        let isPublic = false;
        const [roomRows] = await db.execute(
          "SELECT room_code, is_public FROM sessions WHERE id = ?",
          [roomId]
        );
        if (roomRows.length > 0) {
          roomCode = roomRows[0].room_code;
          isPublic = roomRows[0].is_public;
        }

        const clientsInRoom = getRoomClients(roomId);
        clientsInRoom.delete(ws);

        if (clientsInRoom.size === 0) {
          connectedClients.delete(roomId);
          console.log(
            `Sala ${roomCode} (ID: ${roomId}) eliminada del mapa de clientes por estar vacía.`
          );
          if (roomRows.length > 0) {
            await db.execute("DELETE FROM sessions WHERE id = ?", [roomId]);
            console.log(
              `Sala ${roomCode} (ID: ${roomId}) eliminada de la base de datos.`
            );
          }
        } else {
          const [updatedPerformances] = await db.execute(
            "SELECT u.username FROM performances p JOIN users u ON p.user_id = u.id WHERE p.sessio_id = ?",
            [roomId]
          );
          const playerUsernames = updatedPerformances.map((p) => p.username);

          const playerLeftPayload = {
            roomId: roomCode,
            players: playerUsernames,
            maxPlayers: MAX_PLAYERS_PER_ROOM,
          };
          broadcastToRoom(roomId, {
            action: "player_left",
            payload: playerLeftPayload,
          });
          console.log(
            `Jugador ${
              ws.username
            } desconectado de la sala ${roomCode}. Jugadores restantes: [${playerUsernames.join(
              ", "
            )}]`
          );
        }

        // If the room was public, update lists for everyone
        if (isPublic) {
          await get_public_rooms();
        }
      } catch (error) {
        console.error(
          `Error al limpiar la sala ${roomId} para el usuario ${ws.username} en desconexión:`,
          error
        );
      }
    }
  });
});

async function get_public_rooms(ws) {
  try {
    const [rooms] = await db.execute(
      `SELECT s.room_code, s.exercise_text, COUNT(p.id) as num_players
             FROM sessions s
             LEFT JOIN performances p ON s.id = p.sessio_id
             WHERE s.is_public = TRUE AND s.status = 'waiting'
             GROUP BY s.id`
    );

    const publicRooms = rooms.map((room) => ({
      id: room.room_code,
      exercise: room.exercise_text,
      jugadores: room.num_players,
      maxJugadores: MAX_PLAYERS_PER_ROOM,
    }));

    // Enviar a todos los clientes conectados
    wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(
          JSON.stringify({
            action: "public_rooms_list",
            payload: publicRooms,
          })
        );
      }
    });
  } catch (error) {
    console.error("Error al obtener las salas públicas:", error);
    if (ws) {
      ws.send(
        JSON.stringify({
          action: "error",
          payload: { message: "Error al obtener las salas públicas." },
        })
      );
    }
  }
}
