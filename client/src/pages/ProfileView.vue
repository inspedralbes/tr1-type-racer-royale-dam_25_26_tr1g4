<template>
  <v-container>
    <v-row justify="center">
      <v-col cols="12" md="8">
        <v-card class="elevation-12">
          <v-toolbar color="primary" dark>
            <v-toolbar-title class="text-h5 font-weight-bold">
              Perfil de {{ stats.username }}
            </v-toolbar-title>
          </v-toolbar>

          <v-card-text>
            <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>
            
            <div v-if="loading" class="text-center pa-8">
              <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
              <p class="mt-4">Cargando estadísticas...</p>
            </div>

            <v-list v-if="!loading && stats" lines="two">
              <v-list-item title="Victorias" :subtitle="stats.wins">
                <template v-slot:prepend>
                  <v-icon color="success">mdi-trophy</v-icon>
                </template>
              </v-list-item>
              <v-divider inset></v-divider>
              <v-list-item title="Derrotas" :subtitle="stats.looses">
                <template v-slot:prepend>
                  <v-icon color="error">mdi-emoticon-sad-outline</v-icon>
                </template>
              </v-list-item>
              <v-divider inset></v-divider>
              <v-list-item title="Puntuación Total" :subtitle="stats.totalScore">
                <template v-slot:prepend>
                  <v-icon color="warning">mdi-star-circle</v-icon>
                </template>
              </v-list-item>
              <v-divider inset></v-divider>
              <v-list-item title="Mejor Puntuación" :subtitle="stats.bestScore">
                <template v-slot:prepend>
                  <v-icon color="info">mdi-seal</v-icon>
                </template>
              </v-list-item>
              <v-divider inset></v-divider>
              <v-list-item title="Partidas Jugadas" :subtitle="stats.totalGames">
                <template v-slot:prepend>
                  <v-icon color="grey">mdi-gamepad-variant</v-icon>
                </template>
              </v-list-item>
              <v-divider inset></v-divider>
              <v-list-item title="Repeticiones Totales" :subtitle="stats.totalReps">
                <template v-slot:prepend>
                  <v-icon color="grey">mdi-weight-lifter</v-icon>
                </template>
              </v-list-item>
              <v-divider inset></v-divider>
              <v-list-item title="Puntuación Media (en partida)" :subtitle="stats.averagePerformanceScore">
                <template v-slot:prepend>
                  <v-icon color="grey">mdi-chart-line</v-icon>
                </template>
              </v-list-item>
              <v-divider inset></v-divider>
              <v-list-item title="Máximas Repeticiones (en partida)" :subtitle="stats.maxRepsInAGame">
                <template v-slot:prepend>
                  <v-icon color="grey">mdi-chevron-up-box</v-icon>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '@/api';

const stats = ref({});
const loading = ref(true);
const error = ref(null);

onMounted(async () => {
  const username = localStorage.getItem('username');
  if (!username) {
    error.value = "No se ha encontrado el nombre de usuario. Por favor, inicia sesión de nuevo.";
    loading.value = false;
    return;
  }

  try {
    const data = await api.get(`/stats/${username}`);
    stats.value = data;
  } catch (err) {
    error.value = err.message || "No se pudieron cargar las estadísticas.";
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.v-list-item {
  padding-left: 0;
}
.v-divider--inset {
  margin-left: 56px;
}
</style>
