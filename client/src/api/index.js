let API_BASE_URL;

if (import.meta.env.MODE === 'production') {
  // En producción, la URL de la API es relativa para que el proxy (Nginx) la gestione.
  API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
} else {
  // En desarrollo, apuntamos directamente al backend en localhost:3000.
  API_BASE_URL = 'http://localhost:3000/api';
}

/**
 * Genera la URL correcta para la conexión WebSocket, adaptándose al entorno (desarrollo/producción)
 * y al protocolo de la página (HTTP/HTTPS).
 * @param {string} username El nombre de usuario para incluir en la URL.
 * @returns {string} La URL completa del WebSocket.
 */
function getWebSocketUrl(username) {
  if (import.meta.env.MODE === 'production') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    // La ruta /ws/ es la que Nginx está configurado para redirigir.
    return `${protocol}//${host}/ws/?username=${encodeURIComponent(username)}`;
  } else {
    // En desarrollo, nos conectamos directamente al servidor de backend.
    return `ws://localhost:3000?username=${encodeURIComponent(username)}`;
  }
}

export { API_BASE_URL, getWebSocketUrl };

const api = {
  async get(endpoint) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  async post(endpoint, data) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
};

export default api;