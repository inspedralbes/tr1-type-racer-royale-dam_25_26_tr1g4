<template>
  <v-container class="pb-0 pt-15">
    <v-row justify="center">
      <v-col cols="12" md="6" sm="8">
        <v-card class="frosted-card elevation-12" hover rounded="lg" 
          color="#000000c4"
          >

          <v-tabs v-model="tab" bg-color="transparent" fixed-tabs color="#ffffff" class="cutive-mono-tabs">
            <v-tab value="private">Sala Privada</v-tab>
            <v-tab value="public">Salas Públicas</v-tab>
          </v-tabs>

          <v-window v-model="tab">
            <v-window-item value="private">
              <v-card-text class="pa-5">

                <v-btn @click="crearSala"
                block  
                size="large"
                class="mb-6 primary-action-btn" 
                color="rgba(168, 160, 160, 1)" 
                :loading="loading"
                rounded="lg"
                elevation="6"
                variant="tonal"
                >
                  Crear Sala Privada
                </v-btn>
                <v-divider class="mb-6 card-divider-style"></v-divider>
                <h3 class="mb-4 v-card-title h3-style">O Unirse a Sala Existente</h3>

                <v-alert v-if="errorMessage" type="error" class="mb-4" closable @click:close="errorMessage = ''" color="#FF5252" variant="tonal">
                  {{ errorMessage }}
                </v-alert>

                <v-form @submit.prevent="unirseSalaPrivada">
                  <v-text-field
                    v-model="salaPrivada.id"
                    label="ID de la Sala"
                    prepend-inner-icon="mdi-pound"
                    variant="outlined"
                    class="mb-3 v-text-field"
                    :disabled="loading"
                    required
                    dark
                    filled
                  ></v-text-field>

                  <v-btn 
                  type="submit" 
                  block 
                  color="rgba(168, 160, 160, 1)" 
                   size="large" 
                   :loading="loading"
                   class="mb-6 primary-action-btn"
                   variant="tonal"
                   elevation="6"            
>
                    Unirse
                  </v-btn>
                </v-form>
              </v-card-text>
            </v-window-item>

            <v-window-item value="public">
              <v-card-text class="pa-5">

                <v-btn 
                @click="crearSalaPublica" 
                block 
                color="#ffffff" 
                size="large"
                 class="mb-6 primary-action-btn"
                  :loading="loading"
                  variant="flat">

                  Crear Sala Pública
                </v-btn>

                <v-divider class="mb-6 card-divider-style"></v-divider>

                <h3 class="mb-4 v-card-title h3-style">Salas Públicas Disponibles</h3>

                <v-list lines="two" bg-color="transparent" class="cutive-mono-list">
                  <v-list-item
                    v-for="sala in salasPublicas"
                    :key="sala.id"
                    :title="`Sala ${sala.id}`"
                  >
                    <template v-slot:append>
                      <v-chip class="mr-4" 
                      color="rgba(255, 255, 255, 0.2)" 
                      label 
                      size="small" 
                      variant="flat"
                      >{{ sala.jugadores }} / {{ sala.maxJugadores }}</v-chip>
                      
                      <v-btn
                        @click="unirseSalaPublica(sala.id)"
                        :disabled="sala.jugadores >= sala.maxJugadores || loading"
                        color="#ffffff"
                        variant="text"
                        class="secondary-action-btn"
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
                  color="#402c42"
                >
                  No hay salas públicas disponibles en este momento.
                </v-alert>

                <v-divider class="my-6"></v-divider>

                <h3 class="mb-4">O Crear una Sala Pública</h3>
                <v-btn @click="crearSalaPublica" block color="secondary" size="large" class="mb-6" :loading="loading">
                  Crear Sala Pública
                </v-btn>
              </v-card-text>
            </v-window-item>
          </v-window>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
  <v-row justify="center" class="mt-n8">
    <v-col cols="12" md="6" sm="8">
      <v-card class="frosted-card elevation-6 leaderboard-panel rounded-lg" color="#1c1c1c">
        <v-card-title class="text-center py-4 bg-primary text-white v-card-title" style="background-color: #121212; border-radius: 8px 8px 0 0;">
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
  wsStore.sendMessage({ action: 'create_public_room', payload: {} });
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

.primary-action-btn{
  font-family: 'Cutive Mono', monospace !important; 
    font-weight: 400 ;
    letter-spacing: 3px;
}

.frosted-card {
  
  box-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.2), 
    0 10px 15px -3px rgba(0, 0, 0, 0.4); 
  border: 1px solid #402c42; 
  border-radius: 8px; 
  color: #fafcffff; 
  padding: 24px 32px; 
  position: relative;
  overflow: hidden;
    transition: transform 0.3s ease-out, box-shadow 0.3s ease-out; 
}
.frosted-card::after{ 
  content: '';
    position: absolute;
    top: 0;
    left: -150%; 
    height: 100%;
    width: 50%; /* Hem de definir l'amplada aquí per al "glint" */

    background: linear-gradient(
        45deg, 
        transparent 0%, 
       rgba(255, 255, 255, 0.08) 40%, 
        rgba(255, 255, 255, 0.08) 60%,
        transparent 100%
    );
    transform: skewX(-45deg);
    z-index: 10;
   transition: none;
}

.frosted-card :deep(.v-field__input) {
  background-color: #2a2a2a !important; /* Cohesió amb v-input__control */
  color: hsl(180, 20%, 1%); 
  border-radius: 4px;
 
}

.frosted-card .v-input input {
    color: hwb(0 0% 0%) !important; 
    font-size: 1rem;
    padding-top: 10px;
}

.frosted-card .v-input--text-field {
    margin-bottom: 20px;
}

.primary-action-btn:hover {
    opacity: 0.9; 
    transform: translateY(-1px); 
    border-bottom: 2px solid hsla(151, 100%, 95%, 1.00); /* Eliminem el border bottom que xoca amb el flat button */
  
}

/* Modificació del secondary-action-btn per als botons Unirse/Llena */
.secondary-action-btn {
    font-family: 'Cutive Mono', monospace !important; 
    font-weight: 400 ;
    letter-spacing: 3px;

}

.v-card-title {
    color: hwb(0 100% 0%) !important; 
    position: relative;
    padding-bottom: 20px; 
    font-family: 'Cutive Mono', monospace !important; 
    font-weight: 200 ;
    letter-spacing: 1px;
}
/* Estil específic per al h3 d'Unirse */
.h3-style {
    font-size: 1.25rem;
    font-weight: 300 !important;
}

.v-text-field{
    font-family: 'Cutive Mono', monospace !important; 
    font-weight: 400 ;
    letter-spacing: 1px;
    color: hwb(0 0% 100%) !important;
}

.cutive-mono-tabs :deep(.v-tab) {
    font-family: 'Cutive Mono', monospace !important;
    font-weight: 400;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.6) !important;
    transition: color 0.2s;
}

.cutive-mono-tabs :deep(.v-tab--selected) {
    color: hsl(0, 0%, 0%) !important;
    font-weight: 700 !important;
}

/* Estil per a la línia divisòria (fosc i subtil) */
.card-divider-style {
    border-color: rgba(255, 255, 255, 0.1) !important;
}
.cutive-mono-list {
    color: hsl(0, 0%, 0%) !important;
}

.list-item-style {
    border-bottom: 1px solid rgba(255, 255, 255, 0.05); /* Separador subtil */
    padding: 10px 0;
    transition: background-color 0.2s;
}

.list-item-style:hover {
    background-color: rgba(255, 255, 255, 0.05) !important;
}

.list-item-style :deep(.v-list-item-title) {
    font-family: 'Cutive Mono', monospace !important;
    color: #ffffff !important;
    font-weight: 700;
}
.list-item-style :deep(.v-list-item-subtitle) {
    font-family: 'Cutive Mono', monospace !important;
    color: rgba(255, 255, 255, 0.7) !important;
}
</style>
