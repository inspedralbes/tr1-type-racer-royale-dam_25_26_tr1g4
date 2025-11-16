<template>
  <div class="profile-menu">
    <v-menu offset-y>
      <template v-slot:activator="{ props }">
        <v-btn v-bind="props" icon>
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
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useWebSocketStore } from '@/stores/websocket';

const router = useRouter();
const wsStore = useWebSocketStore();

const username = computed(() => localStorage.getItem('username') || '');
const userInitial = computed(() => (username.value ? username.value[0].toUpperCase() : ''));

const logout = () => {
  // Clear user data
  localStorage.removeItem('fithub-token');
  localStorage.removeItem('username');

  // Disconnect WebSocket
  wsStore.disconnect();

  // Redirect to login
  router.push({ name: 'login' });
};
</script>

<style scoped>
.profile-menu {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 1000;
}
</style>
