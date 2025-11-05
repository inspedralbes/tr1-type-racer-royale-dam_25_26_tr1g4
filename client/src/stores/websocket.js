
import { defineStore } from 'pinia';

export const useWebSocketStore = defineStore('websocket', {
  state: () => ({
    socket: null,
    isConnected: false,
  }),
  actions: {
    connect(url) {
      if (this.socket) {
        return;
      }
      this.socket = new WebSocket(url);
      this.socket.onopen = () => {
        this.isConnected = true;
        console.log('WebSocket connected');
      };
      this.socket.onclose = () => {
        this.isConnected = false;
        this.socket = null;
        console.log('WebSocket disconnected');
      };
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    },
    disconnect() {
      if (this.socket) {
        this.socket.close();
      }
    },
    sendMessage(message) {
      if (this.socket && this.isConnected) {
        this.socket.send(JSON.stringify(message));
      } else {
        console.error('WebSocket is not connected.');
      }
    },
  },
});
