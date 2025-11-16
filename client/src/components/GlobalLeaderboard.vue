<script setup>
import { ref, onMounted } from 'vue';
// using native fetch instead of axios

const globalLeaderboard = ref([]);
const isLoading = ref(true);

// URL Api completa 
const API_URL = 'http://localhost:3000/api/leaderboard/global'; 

const mockLeaderboard = [
    { username: "CodeMasterCat", max_reps: 980 }, // Serà rank-1
    { username: "DarkByte", max_reps: 750 },    // Serà rank-2
    { username: "User_404", max_reps: 612 },    // Serà rank-3
    { username: "ZzzProgrammer", max_reps: 589 },
    { username: "Kilo_Lima", max_reps: 501 },
];



async function fetchGlobalLeaderboard() {
    isLoading.value = true;
    
    // Simulem un retard per veure l'estat de "Carregant"
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
        // --- Codi real COMENTAT ---
        /*
        const resp = await fetch(API_URL);
        const data = await resp.json();

        if (data && data.success) {
            globalLeaderboard.value = data.leaderboard;
        }
        */
        
        // --- Utilitzem les dades de MOCK per a visualització ---
        globalLeaderboard.value = mockLeaderboard;

        
    } catch (error) {
        console.error("Error carregant el Leaderboard global:", error);
    } finally {
        isLoading.value = false;
    }
}

onMounted(() => {
  fetchGlobalLeaderboard();
});
</script>

<template>
  <div class="global-leaderboard-container" >
    <h2 class="leaderboard-title">Rècords de Repeticions</h2>

    <div v-if="isLoading" class="loading-message cutive-mono-text">
      Carregant la classificació...
    </div>

    <ol v-else-if="globalLeaderboard.length > 0" class="podium-list">
      <li
        v-for="(player, index) in globalLeaderboard"
        :key="player.username"
        :class="`rank-item rank-${index + 1}`"
      >
        <span class="rank">{{ index + 1 }}.</span>
        <span class="username">{{ player.username }}</span>
        <span class="reps">{{ player.max_reps }} Reps</span>
      </li>
    </ol>
    <div v-else class="no-data cutive-mono-text">Encara no hi ha dades de rècords globals.</div>
  </div>
</template>

<style scoped>

.global-leaderboard-container {
    padding: 20px 32px; /* Cohesió amb el padding del frosted-card */
    color: #ffffff;
}
.leaderboard-title {
    font-family: 'Cutive Mono', monospace;
    font-weight: 300;
    font-size: 1.5rem;
    color: #ffffff;
    margin-bottom: 20px;
}
.cutive-mono-text {
    font-family: 'Cutive Mono', monospace;
    color: rgba(255, 255, 255, 0.7);
    padding: 10px 0;
}

.podium-list {
  list-style: none;
  padding: 0;
  font-family: 'Cutive Mono', monospace;
  font-size: 1.1em;
}

.rank-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 15px;
  border-radius: 4px;
  margin-bottom: 8px;
  background: #2a2a2a; 
  color: #ffffff;
  transition: background 0.3s;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.rank-item:hover {
    background: #3a3a3a;
}

.rank {
    font-weight: 700;
    width: 30px;
    text-align: left;
    color: rgb(187, 174, 174); /* Color subtil per al rànquing */
}

.username {
    flex-grow: 1;
    margin: 0 15px;
    color: #ffffff;
}

.reps {
    font-weight: 700;
    color: #f7fffb; /* To de color subtil/accentuat per a les repeticions */
}

.rank-1 {
    /* To de l'or adaptat a fons fosc */
    background: linear-gradient(90deg, #5e0735 0%, #991349 100%) !important; 
    box-shadow: 0 0 10px rgba(236, 64, 122, 0.4);
    color: #ffffff; 
    transform: scale(1.02);
    border: 2px solid #b4325e;
}

.rank-1 .rank {
    color: #ffffff !important;
}

.rank-2 {
  background: #3e3e3e;
    color: #ffffff;
    border: 1px solid #777;
}
.rank-3 {
 /* To de bronze subtil */
    background: #4a3e36;
    color: #ffffff;
    border: 1px solid #855e42;
}
</style>
