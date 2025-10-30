const WebSocket = require('ws');

let clients = new Map(); // socket -> { userId, salaId }

function createWebSocketServer(server) {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', (socket) => {
    console.log('🔌 New WebSocket connection');

    socket.on('message', (message) => {
      try {
        const data = JSON.parse(message);

        if (data.type === 'join') {
          const { userId, salaId } = data;
          clients.set(socket, { userId, salaId });
          console.log(`👤 User ${userId} joined room ${salaId}`);
          socket.send(JSON.stringify({ type: 'joined', salaId }));
        }

        if (data.type === 'pose') {
          const clientInfo = clients.get(socket);
          if (!clientInfo) return;
          for (const [ws, info] of clients.entries()) {
            if (info.salaId === clientInfo.salaId && ws !== socket) {
              ws.send(JSON.stringify({
                type: 'pose-update',
                userId: clientInfo.userId,
                keypoints: data.keypoints,
              }));
            }
          }
        }
      } catch (err) {
        console.error('❌ WS message error:', err);
      }
    });

    socket.on('close', () => {
      console.log('❌ WebSocket disconnected');
      clients.delete(socket);
    });
  });

  console.log('🌐 WebSocket server ready');
}

module.exports = { createWebSocketServer };

