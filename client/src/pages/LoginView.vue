<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSocketStore } from '@/stores/socket';

const router = useRouter();
const socketStore = useSocketStore();

const email = ref('');
const password = ref('');
const loading = ref(false);

function handleLogin() {
  loading.value = true;

  setTimeout(() => {
    loading.value = false;
    const salaId = '1';
    const userId = email.value || 'guest-' + Math.floor(Math.random() * 1000);
    socketStore.connect(userId, salaId);

    router.push({ name: 'sala', params: { id: salaId } });
  }, 1500);
}
</script>

<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="elevation-12 pa-4">
          <v-card-title class="text-h5 text-center mb-4">
            FitHub - Accés
          </v-card-title>

          <v-card-text>
            <v-form @submit.prevent="handleLogin">
              <v-text-field
                v-model="email"
                label="Correu Electrònic"
                prepend-icon="mdi-account"
                type="email"
                required
                :disabled="loading"
              ></v-text-field>

              <v-text-field
                v-model="password"
                label="Contrasenya"
                prepend-icon="mdi-lock"
                type="password"
                required
                :disabled="loading"
              ></v-text-field>

              <v-btn
                color="primary"
                block
                size="large"
                class="mt-4"
                type="submit"
                :loading="loading"
                :disabled="loading"
              >
                Entrar a la Sala
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
