import { defineStore } from 'pinia';

export const useSocketStore = defineStore('socket', {
  state: () => ({
    ws: null,
    connected: false,
    salaId: null,
    userId: null,
  }),
  actions: {
    connect(userId, salaId) {
      this.ws = new WebSocket('ws://localhost:3000');
      this.userId = userId;
      this.salaId = salaId;

      this.ws.onopen = () => {
        console.log('✅ WS connected');
        this.connected = true;
        this.ws.send(JSON.stringify({ type: 'join', userId, salaId }));
      };

      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'pose-update') {
          console.log(`📩 Pose from ${msg.userId}`, msg.keypoints);
        }
      };

      this.ws.onclose = () => {
        console.log('❌ WS closed');
        this.connected = false;
      };
    },

    sendPose(keypoints) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'pose', keypoints }));
      }
    },
  },
});
