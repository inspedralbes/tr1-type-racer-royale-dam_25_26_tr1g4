<template>
  <v-container class="fill-height">
    <v-row justify="center" align="center">
      <v-col cols="12" md="6" sm="8">
        <v-card class="elevation-12">
          <v-tabs v-model="tab" bg-color="primary" fixed-tabs>
            <v-tab value="private">Sala Privada</v-tab>
            <v-tab value="public">Salas Públicas</v-tab>
          </v-tabs>

          <v-window v-model="tab">
            <v-window-item value="private">
              <v-card-text class="pa-5">
                <v-btn @click="crearSala" block color="secondary" size="large" class="mb-6" :loading="loading">
                  Crear Sala Nueva
                </v-btn>
                <v-divider class="mb-6"></v-divider>
                <h3 class="mb-4">O Unirse a Sala Existente</h3>

                <v-alert v-if="errorMessage" type="error" class="mb-4" closable @click:close="errorMessage = ''">
                  {{ errorMessage }}
                </v-alert>

                <v-form @submit.prevent="unirseSalaPrivada">
                  <v-text-field
                    v-model="salaPrivada.id"
                    label="ID de la Sala"
                    prepend-inner-icon="mdi-pound"
                    variant="outlined"
                    class="mb-3"
                    :disabled="loading"
                    required
                  ></v-text-field>

                  <v-btn type="submit" block color="primary" size="large" :loading="loading">
                    Unirse
                  </v-btn>
                </v-form>
              </v-card-text>
            </v-window-item>

            <v-window-item value="public">
              <v-card-text class="pa-5">
                <h3 class="mb-4">Salas Públicas Disponibles</h3>

                <v-list lines="two">
                  <v-list-item
                    v-for="sala in salasPublicas"
                    :key="sala.id"
                    :title="sala.nombre"
                    :subtitle="`${sala.jugadores} / ${sala.maxJugadores} Jugadores`"
                  >
                    <template v-slot:append>
                      <v-btn
                        @click="unirseSalaPublica(sala.id)"
                        :disabled="sala.jugadores >= sala.maxJugadores || loading"
                        color="primary"
                        variant="tonal"
                      >
                        {{
                          sala.jugadores >= sala.maxJugadores
                            ? "Llena"
                            : "Unirse"
                        }}
                      </v-btn>
                    </template>
                  </v-list-item>
                </v-list>

                <v-alert
                  v-if="!loading && salasPublicas.length === 0"
                  type="info"
                  variant="tonal"
                  class="mt-4"
                >
                  No hay salas públicas disponibles en este momento.
                </v-alert>
              </v-card-text>
            </v-window-item>
          </v-window>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

const tab = ref("private");
const loading = ref(false);
const errorMessage = ref("");

const salaPrivada = ref({
  id: "",
});

const salasPublicas = ref([]);

let ws = null;

function connectWebSocket() {
  const username = localStorage.getItem("username");
  if (!username) {
    errorMessage.value =
      "Error de autenticación. Por favor, inicia sesión de nuevo.";
    loading.value = false;
    return;
  }

  ws = new WebSocket(`ws://localhost:7001?username=${encodeURIComponent(username)}`);

  ws.onopen = () => {
    console.log('Conectado al servidor de WebSockets');
    loading.value = false;
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Mensaje del servidor:', data);

    switch (data.action) {
      case 'room_created':
        // El servidor nos ha confirmado que la sala se creó y nos devuelve el ID
        router.push({ name: "sala", params: { id: data.payload.roomId } });
        break;
      case 'player_joined':
        // Un jugador se ha unido, podríamos actualizar la UI si fuera necesario
        console.log(`Jugador unido. Jugadores en la sala: ${data.payload.players.join(', ')}`);
        break;
      case 'room_full':
        // La sala está llena, el juego puede empezar. Navegamos a la sala.
        console.log(`La sala ${data.payload.roomId} está llena. ¡Empezando!`);
        router.push({ name: "sala", params: { id: data.payload.roomId } });
        break;
      case 'error':
        errorMessage.value = data.payload.message;
        loading.value = false;
        break;
    }
  };

  ws.onclose = () => {
    console.log('Desconectado del servidor de WebSockets');
    // Opcional: intentar reconectar
  };

  ws.onerror = (error) => {
    console.error('Error de WebSocket:', error);
    errorMessage.value = "No se pudo conectar con el servidor de salas.";
    loading.value = false;
  };
}

function sendMessage(action, payload) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ action, payload }));
  } else {
    errorMessage.value = "No hay conexión con el servidor.";
  }
}

// --- Métodos ---

function crearSala() {
  loading.value = true;
  errorMessage.value = "";
  sendMessage('create_room', {});
}

function unirseSalaPrivada() {
  if (!salaPrivada.value.id) {
    errorMessage.value = "Por favor, introduce un ID de sala.";
    return;
  }
  loading.value = true;
  errorMessage.value = "";
  sendMessage('join_room', { roomId: salaPrivada.value.id });
}

function unirseSalaPublica(idSala) {
  // La lógica para salas públicas sería similar, enviando un 'join_room'
  // Por ahora, lo mantenemos simple y enfocado en la creación/unión de salas privadas.
  alert(`Funcionalidad para unirse a salas públicas no implementada. ID: ${idSala}`);
}

// --- Ciclo de vida ---

onMounted(async () => {
  loading.value = true;
  connectWebSocket();
  // En una app real, podrías pedir la lista de salas públicas al conectar.
  // sendMessage('get_public_rooms', {});
});

onBeforeUnmount(() => {
  if (ws) {
    ws.close();
  }
});
</script>

<style scoped>
.pa-5 {
  padding: 2.5rem;
}
.mb-4 {
  margin-bottom: 1.5rem;
}
.mb-3 {
  margin-bottom: 1rem;
}
.mb-6 {
  margin-bottom: 2rem;
}
</style>
