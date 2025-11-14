<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="6">
        <v-card class="elevation-12 rounded-lg">
          <v-toolbar color="primary" dark>
            <v-toolbar-title
              class="text-h5 font-weight-bold text-center flex-grow-1"
            >
              Sala de Espera
            </v-toolbar-title>
          </v-toolbar>

          <v-card-text class="pa-6">
            <div class="text-center mb-4">
              <h2 class="text-h4 font-weight-bold text-primary">
                {{ roomId }}
              </h2>
              <p class="text-medium-emphasis">Propietario: {{ owner }}</p>
            </div>

            <v-divider class="my-4"></v-divider>

            <h3 class="text-h6 mb-2">
              Jugadores ({{ players.length }} / {{ maxPlayers }})
            </h3>

            <v-list lines="one" bg-color="transparent">
              <v-list-item
                v-for="player in players"
                :key="player.username"
                class="px-2"
              >
                <template v-slot:prepend>
                  <v-icon color="primary">mdi-account-circle</v-icon>
                </template>

                <v-list-item-title class="font-weight-medium">{{
                  player.username
                }}</v-list-item-title>

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
              El botón para empezar la partida se habilitará cuando todos los
              jugadores estén listos.
            </v-alert>

            <v-divider class="my-4"></v-divider>
          </v-card-text>

          <v-divider></v-divider>

          <v-card-actions class="pa-4" style="align-items: center">
            <v-btn
              color="error"
              @click="exitRoom"
              size="large"
              variant="outlined"
              class="font-weight-bold mr-4"
            >
              <v-icon left class="mr-2">mdi-exit-to-app</v-icon>
              Salir al Menú
            </v-btn>

            <v-btn
              :color="isReady ? 'warning' : 'primary'"
              @click="sendReady"
              size="large"
              variant="elevated"
              class="font-weight-bold"
            >
              <v-icon left class="mr-2">{{
                isReady ? "mdi-close" : "mdi-check"
              }}</v-icon>
              {{ isReady ? "No estoy listo" : "¡Estoy Listo!" }}
            </v-btn>
            <!-- Dropdown with exercises (shows tren: 'inferior' or 'superior') -->
            <v-spacer></v-spacer>
            <v-select
              v-model="selectedExerciseId"
              :disabled="!amIOwner"
              :items="exerciseItems"
              item-title="label"
              item-value="id"
              label="Selecciona exercici"
              dense
              hide-details
              style="max-width: 320px; margin-right: 12px"
            >
              <template v-slot:item="{ props, item }">
                <v-list-item v-bind="props">
                  <template v-slot:title>
                    <div
                      :class="
                        item.raw.tren === 'superior' ? 'text-red' : 'text-blue'
                      "
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
              class="font-weight-bold"
            >
              <v-icon left class="mr-2">mdi-play</v-icon>
              Empezar Partida
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
    <div class="chat-panel">
      <Chat
        :messages="chatMessages"
        :username="wsStore.username"
        @send-message="handleSendMessage"
      />
    </div>
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

const amIOwner = computed(() => wsStore.username === owner.value);

const isReady = computed(() => {
  const me = players.value.find((p) => p.username === wsStore.username);
  return me ? me.ready : false;
});

const allPlayersReady = computed(() => {
  if (players.value.length === 0) return false;
  // Game can start if there is at least one player and all are ready
  return players.value.length > 0 && players.value.every((p) => p.ready);
});

const selectedExerciseId = ref(null);

const exerciseItems = ref([]);

const sendReady = () => {
  wsStore.sendMessage({
    action: "player_ready",
    payload: { roomId: roomId.value },
  });
};

const startGame = () => {
  // include the selected tren value in the payload (can be 'superior' or 'inferior' or any value stored in exercises.tren)
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

const exitRoom = () => {
  wsStore.leaveRoom();
  router.push('/lobby');
};

// Watch for game starting
watch(
  () => wsStore.gameStarting,
  (isStarting) => {
    if (isStarting && wsStore.roomState?.roomId === roomId.value) {
      const selectedExercise = exerciseItems.value.find(e => e.id === selectedExerciseId.value);
      // Use the exercise label for the route, defaulting to 'squats'. Make it lowercase to be safe.
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
  // If the user lands here on a refresh, the roomState will be null.
  // Redirect them to the lobby to prevent being in a broken state.
  if (!wsStore.roomState) {
    router.push('/lobby');
    return;
  }

  wsStore.gameStarting = false;
  console.log(`Entrando en la sala ${roomId.value}`);
  fetchExercises();
});

onBeforeUnmount(() => {
  wsStore.leaveRoom();
});
</script>

<style scoped>
.chat-panel {
  position: absolute;
  bottom: 20px;
  left: 20px;
  width: 350px;
  z-index: 10;
}
</style>

