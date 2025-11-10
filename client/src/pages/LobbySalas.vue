<template>
  <v-container class="pb-0 pt-15">
    <v-row justify="center">
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
  <v-row justify="center" class="mt-n8">
    <v-col cols="12" md="6" sm="8">
      <v-card class="elevation-6 leaderboard-panel rounded-lg">
        <v-card-title class="text-center py-4 bg-primary text-white">
          Tabla de Clasificación Global
        </v-card-title>
        <GlobalLeaderboard />
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup>
import GlobalLeaderboard from '../components/GlobalLeaderboard.vue';
import { ref, onMounted, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { useWebSocketStore } from "@/stores/websocket";
import { SOCKET_URL } from "@/api";

const router = useRouter();
const wsStore = useWebSocketStore();

const tab = ref("private");
const loading = ref(false);

const salaPrivada = ref({ id: "" });

// Computed properties from store
const salasPublicas = computed(() => wsStore.publicRooms);
const errorMessage = computed({
  get: () => wsStore.error,
  set: (value) => { wsStore.error = value; }
});

// Watch for room state changes to navigate
watch(() => wsStore.roomState, (newState) => {
  if (newState && newState.roomId) {
    loading.value = false;
    router.push({ name: "room", params: { roomId: newState.roomId } });
  }
});

function crearSala() {
  loading.value = true;
  wsStore.error = null;
  wsStore.sendMessage({ action: 'create_room', payload: {} });
}

function crearSalaPublica() {
  loading.value = true;
  wsStore.error = null;
  wsStore.sendMessage({ action: 'create_public_room', payload: { exercise_text: 'Ejercicio de prueba' } });
}

function unirseSalaPrivada() {
  if (!salaPrivada.value.id) {
    wsStore.error = "Por favor, introduce un ID de sala.";
    return;
  }
  loading.value = true;
  wsStore.error = null;
  wsStore.sendMessage({ action: 'join_room', payload: { roomId: salaPrivada.value.id } });
}

function unirseSalaPublica(idSala) {
  loading.value = true;
  wsStore.error = null;
  wsStore.sendMessage({ action: 'join_room', payload: { roomId: idSala } });
}

// --- Lifecycle ---
onMounted(() => {
  loading.value = true;
  const username = localStorage.getItem("username");
  if (!username) {
    wsStore.error = "Error de autenticación. Por favor, inicia sesión de nuevo.";
    loading.value = false;
    return;
  }

  const connectAndFetch = () => {
    wsStore.sendMessage({ action: 'get_public_rooms', payload: {} });
    loading.value = false;
  };

  if (wsStore.isConnected) {
    connectAndFetch();
    return;
  }

  const connectionTimeout = setTimeout(() => {
    if (!wsStore.isConnected) {
      wsStore.error = "No se pudo conectar con el servidor de salas.";
      loading.value = false;
    }
  }, 5000);

  const unwatch = watch(() => wsStore.isConnected, (isConnected) => {
    if (isConnected) {
      clearTimeout(connectionTimeout);
      connectAndFetch();
      unwatch(); // Stop watching after connection
    }
  });

  const socketURL = (SOCKET_URL || 'ws://localhost:3000/').replace(/^http/, 'ws');
  wsStore.connect(`${socketURL}?username=${encodeURIComponent(username)}`);
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
.leaderboard-panel {
  margin-top: 2rem;
  width: 100%;
}
</style>
