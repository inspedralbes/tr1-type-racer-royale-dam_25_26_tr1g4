<template>
  <ProfileMenu />

  <v-container
    fluid
    class="waiting-room d-flex align-center justify-center min-h-screen pa-6"
  >
    <v-row justify="center" class="w-100">
      <v-col cols="12" md="8" lg="6">
        <div class="text-center mb-8">
          <v-avatar size="90" class="mb-4 bg-transparent">
            <img
              src="@/assets/fitai-logo.png"
              alt="FIT AI Logo"
              class="fitai-logo"
            />
          </v-avatar>
          <h1 class="text-h4 font-weight-bold text-white mb-2 cutive-mono-text">
            Sala de Espera
          </h1>
          <p class="text-medium-emphasis cutive-mono-subtitle">
            començar el teu entrenament
          </p>
        </div>

        <v-card
          class="elevation-12 glass-card rounded-xl pa-6 frosted-card"
          color="#000000c4"
        >
          <div class="text-center mb-6">
            <h2 class="text-h4 font-weight-bold text-primary cutive-mono-text">
              {{ roomId }}
            </h2>
            <p class="text-medium-emphasis cutive-mono-subtitle">
              Propietario: {{ owner }}
            </p>
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
                <v-avatar color="transparent" size="32" class="mr-2">
                  <v-icon color="rgba(241, 255, 248, 1)"
                    >mdi-account-circle</v-icon
                  >
                </v-avatar>
              </template>

              <v-list-item-title
                class="font-weight-medium text-white cutive-mono-text"
              >
                {{ player.username }}
              </v-list-item-title>

              <template v-slot:append>
                <v-chip
                  :color="player.ready ? 'success' : 'error'"
                  variant="elevated"
                  class="font-weight-bold cutive-mono-chip"
                  size="small"
                >
                  {{ player.ready ? "Listo" : "No Listo" }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>

          <div class="mt-6">
            <v-select
              v-model="wsStore.selectedExerciseId"
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
              class="v-text-field w-100"
              menu-icon="mdi-chevron-down"
            >
              <template v-slot:item="{ props, item }">
                <v-list-item v-bind="props">
                  <template v-slot:title>
                    <div
                      :class="
                        item.raw.tren === 'superior'
                          ? 'text-red-accent-2'
                          : 'text-blue-lighten-3'
                      "
                      class="font-weight-bold"
                    >
                      {{ item.raw.label }}
                    </div>
                  </template>
                </v-list-item>
              </template>

              <template v-slot:selection="{ item }">
                <span
                  :class="
                    item.raw.tren === 'superior'
                      ? 'text-red-accent-2'
                      : 'text-blue-lighten-3'
                  "
                  class="font-weight-bold"
                >
                  {{ item.raw.label }}
                </span>
              </template>
            </v-select>
          </div>

          <v-alert
            v-if="amIOwner && !allPlayersReady"
            type="info"
            variant="tonal"
            class="mt-4"
            icon="mdi-information-outline"
            color="#4A148C"
            density="compact"
          >
            <span class="text-caption"
              >Espera a que todos estén listos para empezar.</span
            >
          </v-alert>

          <v-divider class="my-6 card-divider-style"></v-divider>

          <v-card-actions class="pa-0">
            <v-btn
              v-if="amIOwner"
              block
              color="success"
              @click="startGame"
              :disabled="!allPlayersReady"
              size="x-large"
              variant="tonal"
              elevation="6"
              class="font-weight-bold primary-action-btn"
            >
              <v-icon left class="mr-2">mdi-play</v-icon>
              Empezar Partida
            </v-btn>

            <v-btn
              v-else
              block
              :color="isReady ? 'warning' : 'rgba(168, 160, 160, 1)'"
              @click="sendReady"
              size="x-large"
              variant="tonal"
              elevation="6"
              class="font-weight-bold primary-action-btn"
            >
              <v-icon left class="mr-2">{{
                isReady ? "mdi-close" : "mdi-check"
              }}</v-icon>
              {{ isReady ? "No estoy listo" : "¡Estoy Listo!" }}
            </v-btn>
          </v-card-actions>

          <v-btn
            block
            variant="text"
            color="grey"
            @click="exitRoom"
            class="mt-4"
            size="small"
          >
            <v-icon left>mdi-arrow-left</v-icon>
            Salir al Lobby
          </v-btn>
        </v-card>

        <v-btn
          color="rgba(168, 160, 160, 1)"
          icon
          size="large"
          class="chat-toggle-button"
          @click="toggleChat"
          variant="elevated"
        >
          <v-icon>{{ chatOpen ? "mdi-close" : "mdi-chat" }}</v-icon>
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
import ProfileMenu from "@/components/ProfileMenu.vue";
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
const allPlayersReady = computed(
  () => players.value.length > 0 && players.value.every((p) => p.ready)
);

const exerciseItems = ref([]);

const sendReady = () => {
  wsStore.sendMessage({
    action: "player_ready",
    payload: { roomId: roomId.value },
  });
};

const exitRoom = () => {
  wsStore.leaveRoom();
  router.push("/lobby");
};

const startGame = () => {
  wsStore.sendMessage({
    action: "start_game",
    payload: { roomId: roomId.value, exerciseId: wsStore.selectedExerciseId },
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
      const selectedExercise = exerciseItems.value.find(
        (e) => e.id === wsStore.selectedExerciseId
      );
      const exerciseName = selectedExercise
        ? selectedExercise.label.toLowerCase()
        : "squats";
      router.push({
        name: "sala",
        params: { id: roomId.value, exercise: exerciseName },
      });
    }
  }
);

onMounted(() => {
  wsStore.gameStarting = false;
  fetch("http://localhost:3000/api/workouts")
    .then((res) => res.json())
    .then((data) => {
      if (data && data.exercises) {
        exerciseItems.value = data.exercises.map((e) => ({
          label: e.name,
          id: e.id,
          tren: e.tren,
        }));
        if (exerciseItems.value.length > 0)
          wsStore.selectedExerciseId = exerciseItems.value[0].id;
      }
    })
    .catch((err) => console.error("Error carregant exercicis:", err));
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
  margin-left: 10px;
  display: flex;
  align-items: center;
}
.minimal-nav {
  background-color: rgba(0, 0, 0, 0.95) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
}
.nav-title {
  font-family: "Inter", sans-serif;
  letter-spacing: 1.5px;
  font-weight: 300 !important;
  color: #ffffff !important;
}
.waiting-room {
  background: linear-gradient(135deg, #121212 0%, #21004c 70%, #4a148c 100%);
  background-attachment: fixed !important;
  min-height: 100vh;
  color: white;
}
.frosted-card {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2),
    0 10px 15px -3px rgba(0, 0, 0, 0.4);
  border: 1px solid #402c42;
  border-radius: 12px !important;
  color: hsl(216, 100%, 99%);
  background: #000000c4 !important;
  backdrop-filter: blur(8px);
}
.cutive-mono-text {
  font-family: "Cutive Mono", monospace !important;
  font-weight: 400;
  letter-spacing: 1px;
}
.cutive-mono-subtitle {
  font-family: "Cutive Mono", monospace !important;
  color: rgba(255, 255, 255, 0.65) !important;
}
.primary-action-btn {
  font-family: "Cutive Mono", monospace !important;
  font-weight: 400 !important;
  letter-spacing: 3px;
}
.primary-action-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}
/* Estilos importantes para el Select */
.v-text-field :deep(.v-field__input),
.v-text-field :deep(.v-select__selection) {
  font-family: "Cutive Mono", monospace !important;
  font-weight: 400 !important;
  letter-spacing: 1px;
  /* IMPORTANTE: Permitir que el color venga del slot, quitamos el override global solo si es necesario,
     pero aquí usamos clases de texto específicas en el slot que deberían tener prioridad. */
  background-color: #2a2a2a !important;
  border-radius: 4px;
}
.v-text-field :deep(.v-field__overlay) {
  background-color: #2a2a2a !important;
}
.cutive-mono-list {
  background: transparent;
  color: hwb(0 100% 0%) !important;
}
.list-item-style {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 10px 0;
  transition: background-color 0.2s;
}
.list-item-style:hover {
  background-color: rgba(73, 255, 155, 0.05) !important;
}
.list-item-style :deep(.v-list-item-title) {
  font-family: "Cutive Mono", monospace !important;
  color: hwb(0 88% 0%) !important;
  font-weight: 700;
}
.list-item-style :deep(.v-list-item-subtitle) {
  font-family: "Cutive Mono", monospace !important;
  color: hsla(0, 100%, 92%, 0.702) !important;
}
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
.chat-toggle-button {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 100;
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
