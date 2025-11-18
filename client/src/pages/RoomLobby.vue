<template>
  <div>
    <v-app-bar
      class="minimal-nav" 
      dark 
      flat
      height="58"
    > 
      
      <v-toolbar-title class="text-h5 nav-title font-weight-light">
        <v-icon left color="white">mdi-run-fast</v-icon> 
        FitAI<span class="font-weight-bold ml-1">AI</span>
      </v-toolbar-title>

      <v-spacer></v-spacer>

      <v-btn text class="nav-item">
        INICI
      </v-btn>

      <v-btn text class="nav-item">
        PANELL
      </v-btn>
      
      <v-btn text class="nav-item">
        PLANS
      </v-btn>

      <div class="profile-menu-integrated">
        <v-menu offset-y>
          <template v-slot:activator="{ props }">
            <v-btn v-bind="props" icon class="nav-profile-btn-adjusted">
              <v-avatar color="primary">
                <span class="white--text text-h5">{{ userInitial }}</span>
              </v-avatar>
            </v-btn>
          </template>
          <v-list>
            <v-list-item :to="{ name: 'profile' }">
              <v-list-item-title>Mi Perfil</v-list-item-title>
            </v-list-item>
            <v-list-item @click="logout">
              <v-list-item-title>Cerrar Sesión</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </v-app-bar>
  </div>

  
  
  <v-container fluid class="waiting-room d-flex align-center justify-center min-h-screen pa-6">
    <v-row justify="center" class="w-100">
      <v-col cols="12" md="8" lg="6">
        <div class="text-center mb-8">
          <v-avatar size="90" class="mb-4 bg-transparent">
            <img src="@/assets/fitai-logo.png" alt="FIT AI Logo" class="fitai-logo" />
          </v-avatar>
          <h1 class="text-h4 font-weight-bold text-white mb-2 cutive-mono-text">Sala de Espera</h1>
          <p class="text-medium-emphasis cutive-mono-subtitle">començar el teu entrenament</p>
        </div>

        <v-card 
          class="elevation-12 glass-card rounded-xl pa-6 frosted-card"
          color="#000000c4"
        >
          <div class="text-center mb-6">
            <h2 class="text-h4 font-weight-bold text-primary cutive-mono-text">{{ roomId }}</h2>
            <p class="text-medium-emphasis cutive-mono-subtitle">Propietario: {{ owner }}</p>
          </div>

          <v-divider class="mb-6 card-divider-style"></v-divider>

          <h3 class="text-h6 mb-2 text-white cutive-mono-text">
            Jugadores ({{ players.length }} / {{ maxPlayers }})
          </h3>

          <v-list lines="one" class="glass-list cutive-mono-list">
            <v-list-item
              v-for="player in players"
              :key="player.username"
              class="px-2 list-item-style"
            >
              <template v-slot:prepend>
                <v-icon color="rgba(241, 255, 248, 1)">mdi-account-circle</v-icon>
              </template>

              <v-list-item-title class="font-weight-medium text-white cutive-mono-text">
                {{ player.username }}
              </v-list-item-title>

              <template v-slot:append>
                <v-chip
                  :color="player.ready ? 'success' : 'error'"
                  variant="elevated"
                  class="font-weight-bold cutive-mono-chip"
                >
                  {{ player.ready ? "Listo" : "No Listo" }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>

          <v-alert
            v-if="amIOwner && !allPlayersReady"
            type="info"
            variant="tonal"
            class="mt-4"
            icon="mdi-information-outline"
            color="#4A148C"
          >
            El botón para empezar la partida se habilitará cuando todos los jugadores estén listos.
          </v-alert>

          <v-divider class="my-6 card-divider-style"></v-divider>

          <v-card-actions class="pa-0 flex-wrap justify-space-between align-center">
            <v-btn
              :color="isReady ? 'warning' : 'rgba(168, 160, 160, 1)'"
              @click="sendReady"
              size="large"
              variant="tonal"
              elevation="6"
              class="font-weight-bold mb-3 primary-action-btn"
            >
              <v-icon left class="mr-2">{{ isReady ? "mdi-close" : "mdi-check" }}</v-icon>
              {{ isReady ? "No estoy listo" : "¡Estoy Listo!" }}
            </v-btn>

            <v-select
              v-model="selectedExerciseId"
              :disabled="!amIOwner"
              :items="exerciseItems"
              item-title="label"
              item-value="id"
              label="Selecciona exercici"
              dense
              hide-details
              variant="outlined"
              dark
              filled
              class="exercise-select mb-3 v-text-field"
            >
              <template v-slot:item="{ props, item }">
                <v-list-item v-bind="props">
                  <template v-slot:title>
                    <div
                      :class="item.raw.tren === 'superior' ? 'text-red' : 'text-blue'"
                    >
                      {{ item.raw.label }}
                    </div>
                  </template>
                </v-list-item>
              </template>
            </v-select>

            <v-btn
              v-if="amIOwner"
              color="success"
              @click="startGame"
              :disabled="!allPlayersReady"
              size="large"
              variant="tonal"
              elevation="6"
              class="font-weight-bold mb-3 primary-action-btn"
            >
              <v-icon left class="mr-2">mdi-play</v-icon>
              Empezar Partida
            </v-btn>
          </v-card-actions>
        </v-card>

        <v-btn
          color="rgba(168, 160, 160, 1)"
          icon
          size="large"
          class="chat-toggle-button"
          @click="toggleChat"
          variant="elevated"
        >
          <v-icon>{{ chatOpen ? 'mdi-close' : 'mdi-chat' }}</v-icon>
        </v-btn>

        <div class="chat-panel" :class="{ 'chat-panel-open': chatOpen }">
          <Chat
            :messages="chatMessages"
            :username="wsStore.username"
            @send-message="handleSendMessage"
          />
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useWebSocketStore } from "@/stores/websocket";
import Chat from "@/components/Chat.vue";

const route = useRoute();
const router = useRouter();
const wsStore = useWebSocketStore();

const roomId = ref(route.params.roomId);
const players = computed(() => wsStore.roomState?.players || []);
const maxPlayers = computed(() => wsStore.roomState?.maxPlayers || 4);
const owner = computed(() => wsStore.roomState?.owner || "");
const chatMessages = computed(() => wsStore.chatMessages);
const chatOpen = ref(false);

const toggleChat = () => {
  chatOpen.value = !chatOpen.value;
};

const amIOwner = computed(() => wsStore.username === owner.value);
const isReady = computed(() => {
  const me = players.value.find((p) => p.username === wsStore.username);
  return me ? me.ready : false;
});
const allPlayersReady = computed(() =>
  players.value.length > 0 && players.value.every((p) => p.ready)
);

const selectedExerciseId = ref(null);
const exerciseItems = ref([]);

const sendReady = () => {
  wsStore.sendMessage({ action: "player_ready", payload: { roomId: roomId.value } });
};
const startGame = () => {
  wsStore.sendMessage({
    action: "start_game",
    payload: { roomId: roomId.value, exerciseId: selectedExerciseId.value },
  });
};
const handleSendMessage = (message) => {
  wsStore.sendMessage({
    action: "send_message",
    payload: { roomId: roomId.value, text: message },
  });
};

watch(
  () => wsStore.gameStarting,
  (isStarting) => {
    if (isStarting && wsStore.roomState?.roomId === roomId.value) {
      const selectedExercise = exerciseItems.value.find(e => e.id === selectedExerciseId.value);
      const exerciseName = selectedExercise ? selectedExercise.label.toLowerCase() : 'squats';
      router.push({ name: "sala", params: { id: roomId.value, exercise: exerciseName } });
    }
  }
);

onMounted(() => {
  wsStore.gameStarting = false;
  fetch("http://localhost:3000/api/exercises")
    .then(res => res.json())
    .then(data => {
      if (data && data.exercises) {
        exerciseItems.value = data.exercises.map(e => ({
          label: e.name,
          id: e.id,
          tren: e.tren,
        }));
        if (exerciseItems.value.length > 0)
          selectedExerciseId.value = exerciseItems.value[0].id;
      }
    })
    .catch(err => console.error("Error carregant exercicis:", err));
});
onBeforeUnmount(() => wsStore.resetRoomState());
</script>

<style scoped>
.profile-menu {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 1000;
}

.profile-menu-integrated {
    /* Eliminamos el position: fixed, top, right y z-index que estaban causando problemas */
    margin-left: 10px; /* Separación de los botones de navegación */
    display: flex; /* Asegura que el contenido se alinee dentro de la barra */
    align-items: center;
}

.minimal-nav {
    background-color: rgba(0, 0, 0, 0.95) !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
}

.nav-title {
    font-family: 'Inter', sans-serif;
    letter-spacing: 1.5px; 
    font-weight: 300 !important; 
    color: #ffffff !important;
}

.waiting-room {
  /* Fondo adaptado del lobby */
  background: linear-gradient(
    135deg, 
    #121212 0%,      
    #21004C 70%,      
    #4A148C 100%      
  );
  background-attachment: fixed !important;
  min-height: 100vh;
  color: white;
}

.frosted-card {
  /* Adaptación de la tarjeta principal */
  box-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.2), 
    0 10px 15px -3px rgba(0, 0, 0, 0.4); 
  border: 1px solid #402c42; 
  border-radius: 12px !important; /* Mantener rounded-xl del original */
  color: hsl(216, 100%, 99%); 
  /* Eliminamos padding extra de la tarjeta de lobby, usamos el pa-6 */
  background: #000000c4 !important; /* Color de fondo adaptado */
  backdrop-filter: blur(8px); /* Dejamos el efecto glass */
}

/* Estilo para títulos y texto principal (Cutive Mono) */
.cutive-mono-text {
  font-family: 'Cutive Mono', monospace !important;
  font-weight: 400;
  letter-spacing: 1px;
}
.cutive-mono-subtitle {
  font-family: 'Cutive Mono', monospace !important;
  color: rgba(255, 255, 255, 0.65) !important;
}

/* Estilo para los botones principales (Ready/Start) */
.primary-action-btn{
  font-family: 'Cutive Mono', monospace !important; 
  font-weight: 400 !important;
  letter-spacing: 3px;
}
.primary-action-btn:hover {
  opacity: 0.9; 
  transform: translateY(-1px); 
}

/* Estilo para el campo de selección de ejercicio (v-text-field) */
.v-text-field :deep(.v-field__input),
.v-text-field :deep(.v-select__selection) {
  font-family: 'Cutive Mono', monospace !important; 
  font-weight: 400 !important;
  letter-spacing: 1px;
  color: lch(67.41% 5.41 19.81) !important;
  /* Fondo adaptado para los campos de texto */
  background-color: #2a2a2a !important; 
  border-radius: 4px;
}
.v-text-field :deep(.v-field__overlay) {
  background-color: #2a2a2a !important; /* Asegura el fondo oscuro en los campos */
}

.cutive-mono-list {
  background: transparent;
  color: hwb(0 100% 0%) !important;
}
.list-item-style {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1); /* Separador sutil del lobby */
  padding: 10px 0;
  transition: background-color 0.2s;
}

.list-item-style:hover {
  background-color: rgba(73, 255, 155, 0.05) !important;
}

.list-item-style :deep(.v-list-item-title) {
  font-family: 'Cutive Mono', monospace !important;
  color: hwb(0 88% 0%) !important;
  font-weight: 700;
}
.list-item-style :deep(.v-list-item-subtitle) {
  font-family: 'Cutive Mono', monospace !important;
  color: hsla(0, 100%, 92%, 0.702) !important;
}

/* Estilo para las líneas divisorias */
.card-divider-style {
  border-color: rgba(255, 255, 255, 0.1) !important;
}

.fitai-logo {
  width: 90px;
  height: auto;
  filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.6));
  transition: transform 0.3s ease;
}
.fitai-logo:hover {
  transform: scale(1.03);
}

.text-medium-emphasis {
  color: rgba(255, 255, 255, 0.65);
}

.exercise-select {
  max-width: 300px;
}

.chat-toggle-button {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 100; /* Ensure it's above everything */
}

.chat-panel {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 360px;
  height: 450px;
  z-index: 99;
  transform: translateY(calc(100% + 20px));
  transition: transform 0.3s ease-in-out;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  overflow: hidden;
}

.chat-panel-open {
  transform: translateY(0);
}

/* Media query for smaller screens (e.g., mobile phones) */
@media (max-width: 600px) {
  .chat-panel {
    width: calc(100% - 40px);
    height: 70vh;
    right: 20px;
    left: 20px;
    bottom: 20px;
  }
}/* Media query for smaller screens (e.g., mobile phones) */
@media (max-width: 600px) {
  .chat-panel {
    width: calc(100% - 40px);
    height: 70vh;
    right: 20px;
    left: 20px;
    bottom: 20px;
  }
}/* Media query for smaller screens (e.g., mobile phones) */
@media (max-width: 600px) {
  .chat-panel {
    width: calc(100% - 40px);
    height: 70vh;
    right: 20px;
    left: 20px;
    bottom: 20px;
  }
}/* Media query for smaller screens (e.g., mobile phones) */
@media (max-width: 600px) {
  .chat-panel {
    width: calc(100% - 40px);
    height: 70vh;
    right: 20px;
    left: 20px;
    bottom: 20px;
  }
}/* Media query for smaller screens (e.g., mobile phones) */
@media (max-width: 600px) {
  .chat-panel {
    width: calc(100% - 40px);
    height: 70vh;
    right: 20px;
    left: 20px;
    bottom: 20px;
  }
}
</style>
