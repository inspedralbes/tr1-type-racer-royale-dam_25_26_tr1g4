<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import api from "@/api";

const router = useRouter();

// Variables d'estat
const email = ref("");
const password = ref("");
const username = ref("");
const isRegistering = ref(false);
const loading = ref(false);
const errorMessage = ref(""); 

// 🟢 NOU: Variable per la funcionalitat d'amagar/mostrar la contrasenya
const showPassword = ref(false);

async function handleLogin() {
  errorMessage.value = "";
  loading.value = true;

  try {
    const dataToSend = {
      email: email.value,
      password: password.value,
    };

    const data = await api.post("/users/login", dataToSend);

    // 1. Desem el token i dades de l'usuari
    const { token, username: userFromApi } = data;
    localStorage.setItem("fithub-token", token);
    localStorage.setItem("username", userFromApi); // <-- AFEGIT: Guardem el nom d'usuari
    console.log(`Benvingut, ${userFromApi}!`);

    // 2. Navegació
    router.push({ name: "lobby" });
  } catch (error) {
    // 3. Gestió d'errors (el missatge ja ve del 'throw new Error' de l'api)
    errorMessage.value = error.message || "Error de connexió a la xarxa.";
  } finally {
    loading.value = false;
  }
}

async function handleRegister() {
  errorMessage.value = "";
  loading.value = true;

  try {
    const dataToSend = {
      username: username.value,
      email: email.value,
      password: password.value,
    };

    await api.post("/users/register", dataToSend);

    // Registre completat. Mostrem un missatge i canviem a la vista de login.
    console.log(`Registre completat per a l'usuari: ${username.value}`);

    // Canviem al formulari de login
    isRegistering.value = false;
    // Opcional: Podries afegir un missatge de 'success' per a l'usuari.
  } catch (error) {
    // Gestió d'errors
    errorMessage.value = error.message || "Error de connexió a la xarxa.";
  } finally {
    loading.value = false;
  }
}

function handleSubmit() {
  if (isRegistering.value) {
    handleRegister();
  } else {
    handleLogin();
  }
}
</script>

<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="5" lg="4">
        
        <v-card 
          class="pa-6 pa-md-8 mx-auto frosted-card" 
          hover
          elevation="10" 
          rounded="lg" 
          color="rgba(255, 255, 255, 0.3)"
          max-width="450"
        >
          
          <v-card-title class="text-h4 text-center font-weight-bold mb-4 text-medium-emphasis">
            FitAI - {{ isRegistering ? "NOU REGISTRE" : "ACCÉS" }}
          </v-card-title>

          <v-card-text>
            
            <v-alert v-if="errorMessage" type="error" class="mb-5" variant="tonal" color: >
              {{ errorMessage }}
            </v-alert>

            <v-form @submit.prevent="handleSubmit">
              
              <v-text-field
                v-if="isRegistering"
                v-model="username"
                label="Nom d'Usuari"
                prepend-inner-icon="mdi-account-plus"
                type="text"
                required
                :disabled="loading"
                variant="outlined"
                density="comfortable"
                class="mb-3"
              ></v-text-field>

              <v-text-field
                v-model="email"
                label="Correu Electrònic"
                prepend-inner-icon="mdi-email" 
                type="email"
                required
                :disabled="loading"
                variant="outlined"
                density="comfortable"
                class="mb-3"
              ></v-text-field>

              <v-text-field
                v-model="password"
                label="Contrasenya"
                prepend-inner-icon="mdi-lock"
                :type="showPassword ? 'text' : 'password'"
                :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                @click:append-inner="showPassword = !showPassword"
                required
                :disabled="loading"
                variant="outlined"
                density="comfortable"
                class="mb-6"
              ></v-text-field>
              
              <v-btn
            color="#121212"     
                block
                size="large"
                class="text-button font-weight-bold login-button-gradient"
                type="submit"
                :loading="loading"
                :disabled="loading"
                variant="tonal"
                rounded="lg"
                elevation="6"
              >
                {{ isRegistering ? "REGISTRAR-SE" : "ACCEDIR" }}
              </v-btn>
              
            </v-form>
          </v-card-text>

          <v-card-actions class="justify-center mt-3">
            <v-btn
              variant="text"
              color="secondary"
              size="small"
              :disabled="loading"
              @click="isRegistering = !isRegistering"
            >
              {{
                isRegistering
                  ? "Ja tens compte? Fes Login"
                  : "No tens compte? Registra’t"
              }}
            </v-btn>
          </v-card-actions>
          
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>


<style scoped>
.frosted-card {
  /* 1. Glassmorphism: Aplica blur al fons que es veu a través de la targeta */
  backdrop-filter: blur(30px) saturate(100%);
  
  /* 2. White Outline: Borda blanca més forta per millorar la definició */
  border: 1px solid rgba(204, 170, 243, 0.5); /* 2px gruix i 80% opacitat */
  
  /* 3. Contrast: Assegura que el text no es perdi contra el fons clar */
  color: linear-gradient(
    135deg, 
    #121212 0%,      
    #21004C 70%,      
    #4A148C 100%     
  ) 
}
.frosted-card :deep(.v-field__input) {
 
}
.login-button-gradient {
 
  background: #5c2643;
  background: linear-gradient(
    90deg, 
    #5e0735 0%,     
    #991349 50%,    
    #b4325e 100%    
  ) !important; 

  box-shadow: 0 4px 10px rgba(236, 64, 122, 0.4),
              0 0 15px rgba(236, 64, 122, 0.4) !important;
  transition: transform 0.2s, box-shadow 0.2s;
}

.login-button-gradient:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(236, 64, 122, 0.6), 
              0 0 20px rgba(236, 64, 122, 0.3) !important;
}
</style>
