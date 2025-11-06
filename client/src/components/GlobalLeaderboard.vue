<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios'; 

const globalLeaderboard = ref([]);
const isLoading = ref(true);

// L'URL de l'API completa (assumint que el teu Express s'executa a :3000 i utilitza un prefix 'api')
const API_URL = 'http://localhost:3000/api/leaderboard/global'; 

async function fetchGlobalLeaderboard() {
    isLoading.value = true;
    try {
        const response = await axios.get(API_URL);
        
        if (response.data.success) {
            globalLeaderboard.value = response.data.leaderboard;
        }
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
    <div class="global-leaderboard-container">
        <h2>🥇 Rècords de Repeticions</h2>
        
        <div v-if="isLoading" class="loading-message">Carregant la classificació...</div>
        
        <ol v-else-if="globalLeaderboard.length > 0" class="podium-list">
            <li v-for="(player, index) in globalLeaderboard" :key="player.username" :class="`rank-${index + 1}`">
                <span class="rank">{{ index + 1 }}.</span>
                <span class="username">{{ player.username }}</span>
                <span class="reps">{{ player.max_reps }} Reps</span>
            </li>
        </ol>
        <div v-else class="no-data">Encara no hi ha dades de rècords globals.</div>
    </div>
</template>

<style scoped>
.podium-list { 
    list-style: none; 
    padding: 0; 
    font-size: 1.1em;
}
.podium-list li { 
    display: flex; 
    justify-content: space-between; 
    padding: 10px 15px; 
    border-radius: 5px;
    margin-bottom: 5px;
    background: rgba(255, 255, 255, 0.1);
}
.rank-1 { background: gold; color: #111; font-weight: bold; }
.rank-2 { background: silver; color: #111; }
.rank-3 { background: #cd7f32; color: #111; }
</style>