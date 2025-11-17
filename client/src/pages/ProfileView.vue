<template class = "lobby">
  <div>
 <v-app-bar
class="minimal-nav" 
dark 
 flat
 height="58"> 

 <v-toolbar-title class="text-h5 nav-title font-weight-light">
<v-icon left color="rgba(0, 0, 0, 1)">mdi-run-fast</v-icon> 
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

 <v-btn 
 fab 
  small 
class="nav-profile-btn"
>
 <v-icon>mdi-account</v-icon>
</v-btn>

 </v-app-bar>

</div>
  <v-container class="pt-10 pb-0" fluid>
 <v-row justify="center">
 <v-col cols="12" sm="8" md="5" lg="4"> 
  <v-card class="elevation-12 frosted-card profile-card" 
rounded="lg" 
color="#000000c4">
          <v-toolbar class="v-card-title profile-title" 
flat
 color="transparent" 
dark>

<v-icon left size="30" color="#ffffff">mdi-account-circle</v-icon>
            <v-toolbar-title class="text-h5 font-weight-bold">
              Perfil de {{ stats.username }}
            </v-toolbar-title>
          </v-toolbar>

          <v-card-text class="pa-4">
            <v-alert v-if="error" type="error" class="mb-3" color="#FF5252" variant="tonal" >{{ error }}</v-alert>
            
            <div v-if="loading" class="text-center pa-6">
              <v-progress-circular indeterminate color="#ffffff" size="64"></v-progress-circular>
              <p class="mt-3" style="color: rgba(255, 255, 255, 0.7);">Cargando estadísticas...</p>
            </div>

            <v-list v-if="!loading && stats" lines="one" bg-color="transparent" class="cutive-mono-list profile-list compact-list">
              <v-list-item title="Victorias" :subtitle="stats.wins" class="list-item-style">
                <template v-slot:prepend>
                  <v-icon color="#4CAF50">mdi-trophy</v-icon>
                </template>
              </v-list-item>
              <v-divider inset class="list-divider"></v-divider>
              <v-list-item title="Derrotas" :subtitle="stats.looses" class="list-item-style">
                <template v-slot:prepend>
                  <v-icon color="#F44336">mdi-emoticon-sad-outline</v-icon>
                </template>
              </v-list-item>
              <v-divider inset class="list-divider"></v-divider>
              <v-list-item title="Puntuación Total" :subtitle="stats.totalScore" class="list-item-style">
                <template v-slot:prepend>
                  <v-icon color="#FFC107">mdi-star-circle</v-icon>
                </template>
              </v-list-item>
              <v-divider inset class="list-divider"></v-divider>

              <v-list-item title="Mejor Puntuación" :subtitle="stats.bestScore" class="list-item-style">
                <template v-slot:prepend>
                  <v-icon color="#03A9F4">mdi-seal</v-icon>
                </template>
              </v-list-item>
              <v-divider inset class="list-divider"></v-divider>

              <v-list-item title="Partidas Jugadas" :subtitle="stats.totalGames" class="list-item-style">
                <template v-slot:prepend>
                  <v-icon color="#9e9e9e">mdi-gamepad-variant</v-icon>
                </template>
              </v-list-item>
              <v-divider inset class="list-divider"></v-divider>

              <v-list-item title="Repeticiones Totales" :subtitle="stats.totalReps" class="list-item-style">
                <template v-slot:prepend>
                  <v-icon color="#9e9e9e">mdi-weight-lifter</v-icon>
                </template>
              </v-list-item>
              <v-divider inset class="list-divider"></v-divider>

              <v-list-item title="Puntuación Media (en partida)" :subtitle="stats.averagePerformanceScore" class="list-item-style">
                <template v-slot:prepend>
                  <v-icon color="#9e9e9e">mdi-chart-line</v-icon>
                </template>
              </v-list-item >
              <v-divider inset class="list-divider"></v-divider>

              <v-list-item title="Máximas Repeticiones (en partida)" :subtitle="stats.maxRepsInAGame" class="list-item-style">
                <template v-slot:prepend>
                  <v-icon color="#9e9e9e">mdi-chevron-up-box</v-icon>
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

.nav-title .font-weight-bold {
 color: rgba(241, 255, 248, 1); 
}

.nav-item {
font-family: 'Inter', sans-serif;
color: rgba(255, 255, 255, 0.7) !important; 
font-weight: 400;
 letter-spacing: 1.2px;
 margin: 0 12px;
 padding: 0 5px;
 transition: color 0.2s;
text-transform: uppercase;
}

.nav-item:hover {
color: #ffffff !important; 
 border-bottom: 2px solid hsla(151, 100%, 95%, 1.00); 
 padding-bottom: 6px;
}
/* ----------------------------------------------------- */
/* ESTILS DE LA TARGETA PRINCIPAL (FROSTED) */
/* ----------------------------------------------------- */

.frosted-card {
box-shadow: 
0 4px 6px -1px rgba(0, 0, 0, 0.2), 
0 10px 15px -3px rgba(0, 0, 0, 0.4); 
border: 1px solid #402c42; 
border-radius: 8px; 
color: #fafcffff; 
position: sitcky;
overflow: hidden;
}

/* ----------------------------------------------------- */
/* ESTILS DEL TÍTOL (TOOLBAR) */
/* ----------------------------------------------------- */

.profile-title.v-toolbar {
/* Per Vuetify 3, el color s'aplica al v-card-title, no al v-toolbar interior */
 background-color: rgba(18, 18, 18, 0.8) !important; /* Fons fosc per al títol */
color: #ffffff;
 padding: 12px 24px;
border-bottom: 1px solid #402c42;
}

.profile-title .v-toolbar-title {
 font-family: 'Cutive Mono', monospace !important; 
font-weight: 700 !important;
letter-spacing: 2px;
font-size: 1.25rem !important;
 color: #ffffff;
}

/* ----------------------------------------------------- */
/* ESTILS DE LA LLISTA D'ESTADÍSTIQUES */
/* ----------------------------------------------------- */

.cutive-mono-list .v-list-item {
 /* Color de fons transparent */
 background-color: transparent !important;
 transition: background-color 0.2s;
}

.cutive-mono-list .v-list-item:hover {
background-color: rgba(255, 255, 255, 0.05) !important;
}

.cutive-mono-list :deep(.v-list-item-title) {
font-family: 'Cutive Mono', monospace !important;
color: #ffffff !important; /* Blanc per al títol (l'estadística) */
font-weight: 700;
letter-spacing: 1px;
}
.cutive-mono-list :deep(.v-list-item-subtitle) {
font-family: 'Inter', sans-serif !important;
 color: rgba(255, 255, 255, 0.7) !important; /* Gris clar per a la descripció */
}

/* Ajusta la posició de la línia divisòria */
.list-divider.v-divider--inset {
margin-left: 56px; /* Ajusta per al v-icon */
border-color: rgba(255, 255, 255, 0.1) !important;
}

/* Estil del fons global si s'usa `template class="lobby"` */
.lobby {
background: linear-gradient(
135deg, 
#121212 0%,
#21004C 70%,
 #4A148C 100%
);
background-attachment: fixed !important;
}
</style>
