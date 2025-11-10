let API_BASE_URL;
let SOCKET_URL;

if (import.meta.env.MODE === 'production') {
  // En producción, la URL de la API es relativa para que el proxy (Nginx) la gestione.
  API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
  
  // El socket se conecta a la URL específica definida en las variables de entorno,
  // o se deriva del 'host' actual para mayor flexibilidad.
  if (import.meta.env.VITE_SOCKET_URL) {
    SOCKET_URL = import.meta.env.VITE_SOCKET_URL;
  } else {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    SOCKET_URL = `${protocol}//${window.location.host}/ws`;
  }
} else {
  // En desarrollo, apuntamos directamente al backend en localhost:3000.
  API_BASE_URL = 'http://localhost:3000/api';
  SOCKET_URL = 'ws://localhost:3000';
}

export { API_BASE_URL, SOCKET_URL };

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
  // Add other methods like put, delete if needed
};

export default api;
