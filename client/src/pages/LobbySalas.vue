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
                  Crear Sala Privada
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
                <v-btn @click="crearSalaPublica" block color="secondary" size="large" class="mb-6" :loading="loading">
                  Crear Sala Pública
                </v-btn>
                <v-divider class="mb-6"></v-divider>
                <h3 class="mb-4">Salas Públicas Disponibles</h3>

                <v-list lines="two">
                  <v-list-item
                    v-for="sala in salasPublicas"
                    :key="sala.id"
                    :title="`Sala ${sala.id}`"
                    :subtitle="`Ejercicio: ${sala.exercise}`"
                  >
                    <template v-slot:append>
                      <v-chip class="mr-4">{{ sala.jugadores }} / {{ sala.maxJugadores }}</v-chip>
                      <v-btn
                        @click="unirseSalaPublica(sala.id)"
                        :disabled="sala.jugadores >= sala.maxJugadores || loading"
                        color="primary"
                        variant="tonal"
                      >
                        {{ sala.jugadores >= sala.maxJugadores ? "Llena" : "Unirse" }}
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
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useWebSocketStore } from "@/stores/websocket";

const router = useRouter();
const wsStore = useWebSocketStore();

const tab = ref("private");
const loading = ref(false);
const errorMessage = ref("");

const salaPrivada = ref({ id: "" });
const salasPublicas = ref([]);

function handleWebSocketMessages() {
  if (wsStore.socket) {
    wsStore.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Mensaje del servidor:', data);

      switch (data.action) {
        case 'room_created':
          router.push({ name: "sala", params: { id: data.payload.roomId } });
          break;
        case 'join_success':
          loading.value = false;
          router.push({ name: "sala", params: { id: data.payload.roomId } });
          break;
        case 'player_joined':
          // Actualizar la lista de salas públicas si alguien se une
          wsStore.sendMessage({ action: 'get_public_rooms', payload: {} });
          break;
        case 'public_rooms_list':
          salasPublicas.value = data.payload;
          break;
        case 'room_full':
          console.log(`La sala ${data.payload.roomId} está llena. ¡Empezando!`);
          router.push({ name: "sala", params: { id: data.payload.roomId } });
          break;
        case 'error':
          errorMessage.value = data.payload.message;
          loading.value = false;
          break;
      }
    };
  }
}

function crearSala() {
  loading.value = true;
  errorMessage.value = "";
  wsStore.sendMessage({ action: 'create_room', payload: {} });
}

function crearSalaPublica() {
  loading.value = true;
  errorMessage.value = "";
  // TODO: Pedir al usuario que elija un ejercicio
  wsStore.sendMessage({ action: 'create_public_room', payload: { exercise_text: 'Ejercicio de prueba' } });
}

function unirseSalaPrivada() {
  if (!salaPrivada.value.id) {
    errorMessage.value = "Por favor, introduce un ID de sala.";
    return;
  }
  loading.value = true;
  errorMessage.value = "";
  wsStore.sendMessage({ action: 'join_room', payload: { roomId: salaPrivada.value.id } });
}

function unirseSalaPublica(idSala) {
  loading.value = true;
  errorMessage.value = "";
  wsStore.sendMessage({ action: 'join_room', payload: { roomId: idSala } });
}

// --- Ciclo de vida ---
onMounted(() => {
  loading.value = true;
  const username = localStorage.getItem("username");
  if (!username) {
    errorMessage.value = "Error de autenticación. Por favor, inicia sesión de nuevo.";
    loading.value = false;
    return;
  }

  const connectAndFetch = () => {
    handleWebSocketMessages();
    wsStore.sendMessage({ action: 'get_public_rooms', payload: {} });
    loading.value = false;
  };

  if (wsStore.isConnected) {
    connectAndFetch();
    return;
  }

  wsStore.connect(`ws://localhost:7001?username=${encodeURIComponent(username)}`);

  const connectionTimeout = 5000; // 5 seconds
  const checkInterval = 100; // 100 ms
  let timeElapsed = 0;

  const connectionInterval = setInterval(() => {
    timeElapsed += checkInterval;
    if (wsStore.isConnected) {
      clearInterval(connectionInterval);
      connectAndFetch();
    } else if (timeElapsed >= connectionTimeout) {
      clearInterval(connectionInterval);
      if (!wsStore.isConnected) { // Re-check in case it connected just before timeout
        errorMessage.value = "No se pudo conectar con el servidor de salas.";
        loading.value = false;
      }
    }
  }, checkInterval);
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