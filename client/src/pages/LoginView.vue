
<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';


// Necessitem el router per navegar programàticament a la Sala
const router = useRouter(); 

const email = ref('');
const password = ref('');
const loading = ref(false); // Per simular el procés de login

// Funció que es crida al fer clic a "Entrar"
function handleLogin() {
  loading.value = true;
  
  // 💡 SIMULACIÓ DEL LOGIN:
  // En lloc de fer una crida a l'API, simulem que l'usuari s'autentica
  // i l'enviem directament a la Sala.
  
  setTimeout(() => {
    loading.value = false;
    
    // 1. Definim un ID de Sala de prova (p. ex., un UUID o qualsevol string)
    const salaId = '1'; 
    
    // 2. Navegació a la ruta '/sala/:id'
    // Això comprova que el router estigui ben configurat i carrega PoseDetector.vue
    router.push({ 
      name: 'sala', 
      params: { id: salaId } 
    });
    
  }, 1500); // Esperem 1.5 segons
}
</script>

<template>
  <Suspense>
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
                Entrar a la Sala (Prova)
              </v-btn>
            </v-form>
          </v-card-text>
          
          <v-card-actions class="justify-center">
            <v-btn variant="text" size="small" :disabled="loading">
              Registrar-se
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</Suspense>
</template>