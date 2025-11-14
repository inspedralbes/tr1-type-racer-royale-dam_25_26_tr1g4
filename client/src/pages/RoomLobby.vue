<template>
  <v-container fluid class="waiting-room d-flex align-center justify-center min-h-screen pa-6">
    <v-row justify="center" class="w-100">
      <v-col cols="12" md="8" lg="6">
        <!-- Header with Logo -->
        <div class="text-center mb-8">
          <v-avatar size="90" class="mb-4 bg-transparent">
            <img src="@/assets/fitai-logo.png" alt="FIT AI Logo" class="fitai-logo" />
          </v-avatar>
          <h1 class="text-h4 font-weight-bold text-white mb-2">Sala de Espera</h1>
          <p class="text-medium-emphasis">Prepara’t per començar el teu entrenament</p>
        </div>

        <!-- Main Card -->
        <v-card class="elevation-12 glass-card rounded-xl pa-6">
          <div class="text-center mb-6">
            <h2 class="text-h4 font-weight-bold text-primary">{{ roomId }}</h2>
            <p class="text-medium-emphasis">Propietario: {{ owner }}</p>
          </div>

          <v-divider class="mb-6"></v-divider>

          <h3 class="text-h6 mb-2 text-white">
            Jugadores ({{ players.length }} / {{ maxPlayers }})
          </h3>

          <v-list lines="one" class="glass-list">
            <v-list-item
              v-for="player in players"
              :key="player.username"
              class="px-2"
            >
              <template v-slot:prepend>
                <v-icon color="primary">mdi-account-circle</v-icon>
              </template>

              <v-list-item-title class="font-weight-medium text-white">
                {{ player.username }}
              </v-list-item-title>

              <template v-slot:append>
                <v-chip
                  :color="player.ready ? 'success' : 'error'"
                  variant="elevated"
                  class="font-weight-bold"
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
          >
            El botón para empezar la partida se habilitará cuando todos los jugadores estén listos.
          </v-alert>

          <v-divider class="my-6"></v-divider>

          <v-card-actions class="pa-0 flex-wrap justify-space-between align-center">
            <v-btn
              :color="isReady ? 'warning' : 'primary'"
              @click="sendReady"
              size="large"
              variant="elevated"
              class="font-weight-bold mb-3"
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
              class="exercise-select mb-3"
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
              variant="elevated"
              class="font-weight-bold mb-3"
            >
              <v-icon left class="mr-2">mdi-play</v-icon>
              Empezar Partida
            </v-btn>
          </v-card-actions>
        </v-card>

        <!-- Chat Button -->
        <v-btn
          color="primary"
          icon
          size="large"
          class="chat-toggle-button"
          @click="toggleChat"
        >
          <v-icon>{{ chatOpen ? 'mdi-close' : 'mdi-chat' }}</v-icon>
        </v-btn>

        <!-- Chat Panel -->
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
import api from "@/api";

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

async function fetchExercises() {
  try {
    const data = await api.get("/workouts");
    if (data && data.exercises) {
      // Map into items with label and tren
      exerciseItems.value = data.exercises.map((e) => ({
        label: e.name,
        id: e.id,
        tren: e.tren,
      }));
      // Preselect first item's tren if exists
      if (exerciseItems.value.length > 0)
        selectedExerciseId.value = exerciseItems.value[0].id;
    }
  } catch (err) {
    console.error("Error carregant exercicis:", err);
  }
}

onMounted(() => {
  wsStore.gameStarting = false;
<<<<<<< HEAD
  console.log(`Entrando en la sala ${roomId.value}`);
  fetchExercises();
});

onBeforeUnmount(() => {
  wsStore.resetRoomState();
=======
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
>>>>>>> dev
});
onBeforeUnmount(() => wsStore.resetRoomState());
</script>

<style scoped>
.waiting-room {
  background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%); /* softer purple gradient */
  min-height: 100vh;
  color: white;
}

.glass-card {
  background: rgba(255, 255, 255, 0.12); /* slightly more transparent */
  backdrop-filter: blur(8px); /* softer blur */
  border: 1px solid rgba(255, 255, 255, 0.08); /* lighter border */
}

.glass-list {
  background: transparent;
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
    /* Full width on small screens, with a small margin */
    width: calc(100% - 40px);
    height: 70vh; /* Use a percentage of the viewport height */
    right: 20px;
    left: 20px;
    bottom: 20px;
  }
}
</style>
