<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="6">
        <v-card class="elevation-12 rounded-lg">
          <v-toolbar color="primary" dark>
            <v-toolbar-title class="text-h5 font-weight-bold text-center flex-grow-1">
              Sala de Espera
            </v-toolbar-title>
          </v-toolbar>

          <v-card-text class="pa-6">
            <div class="text-center mb-4">
              <h2 class="text-h4 font-weight-bold text-primary">{{ roomId }}</h2>
              <p class="text-medium-emphasis">Propietario: {{ owner }}</p>
            </div>

            <v-divider class="my-4"></v-divider>

            <h3 class="text-h6 mb-2">Jugadores ({{ players.length }} / {{ maxPlayers }})</h3>
            
            <v-list lines="one" bg-color="transparent">
              <v-list-item
                v-for="player in players"
                :key="player.username"
                class="px-2"
              >
                <template v-slot:prepend>
                  <v-icon color="primary">mdi-account-circle</v-icon>
                </template>

                <v-list-item-title class="font-weight-medium">{{ player.username }}</v-list-item-title>

                <template v-slot:append>
                  <v-chip :color="player.ready ? 'success' : 'error'" variant="elevated" class="font-weight-bold">
                    {{ player.ready ? 'Listo' : 'No Listo' }}
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

          </v-card-text>

          <v-divider></v-divider>

          <v-card-actions class="pa-4">
            <v-btn
              :color="isReady ? 'warning' : 'primary'"
              @click="sendReady"
              size="large"
              variant="elevated"
              class="font-weight-bold"
            >
              <v-icon left class="mr-2">{{ isReady ? 'mdi-close' : 'mdi-check' }}</v-icon>
              {{ isReady ? 'No estoy listo' : '¡Estoy Listo!' }}
            </v-btn>
            <v-spacer></v-spacer>
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
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useWebSocketStore } from '@/stores/websocket';

const route = useRoute();
const router = useRouter();
const wsStore = useWebSocketStore();

const roomId = ref(route.params.roomId);

const players = computed(() => wsStore.roomState?.players || []);
const maxPlayers = computed(() => wsStore.roomState?.maxPlayers || 4);
const owner = computed(() => wsStore.roomState?.owner || '');

const amIOwner = computed(() => wsStore.username === owner.value);

const isReady = computed(() => {
  const me = players.value.find(p => p.username === wsStore.username);
  return me ? me.ready : false;
});

const allPlayersReady = computed(() => {
    if (players.value.length === 0) return false;
    // Game can start if there is at least one player and all are ready
    return players.value.length > 0 && players.value.every(p => p.ready);
});

const sendReady = () => {
  wsStore.sendMessage({
    action: 'player_ready',
    payload: { roomId: roomId.value },
  });
};

const startGame = () => {
  wsStore.sendMessage({
    action: 'start_game',
    payload: { roomId: roomId.value },
  });
};

// Watch for game starting
watch(() => wsStore.gameStarting, (isStarting) => {
  if (isStarting && wsStore.roomState?.roomId === roomId.value) {
    router.push({ name: 'sala', params: { id: roomId.value } });
  }
});

onMounted(() => {
  wsStore.gameStarting = false;
  console.log(`Entrando en la sala ${roomId.value}`);
});

onBeforeUnmount(() => {
  wsStore.resetRoomState();
});
</script>