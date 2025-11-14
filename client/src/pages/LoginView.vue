<script setup>
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import api from "@/api";

const router = useRouter();
const route = useRoute();

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

  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="5" lg="4">
        
        <v-card 
          class="pa-6 pa-md-8 mx-auto frosted-card" 
          hover
          elevation="10" 
          rounded="lg" 
          color="#000000c4"
          max-width="450"
        >
          
          <v-card-title class="text-h4 text-center font-weight-bold mb-4 text-medium-emphasis ">
            FitAI - {{ isRegistering ? "NOU REGISTRE" : "ACCÉS" }}
          </v-card-title>

          <v-card-text class ="pa-8">
            
            <v-alert v-if="errorMessage" type="error" class="mb-5" variant="tonal" >
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
                dark
                filled
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
                dark
                filled
                
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
                dark
                filled
              ></v-text-field>
              
              <v-btn block class="primary-action-btn"
            color="rgba(168, 160, 160, 1)"     

                size="large"
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

.primary-action-btn{
  font-family: 'Cutive Mono', monospace !important; 
    font-weight: 400 ;
    letter-spacing: 1px;

}
.frosted-card {
  
  box-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.2), 
    0 10px 15px -3px rgba(0, 0, 0, 0.4); 
  
  border: 1px solid #402c42; 
  border-radius: 8px; 
  color: #fafcffff; 
  padding: 24px 32px; 
  position: relative;
  overflow: hidden;
    transition: transform 0.3s ease-out, box-shadow 0.3s ease-out; 

}

.frosted-card::after{ 
  content: '';
    position: absolute;
    top: 0;
    left: -150%; 
    height: 100%;

    background: linear-gradient(
        45deg, 
        transparent 0%, 
       rgba(255, 255, 255, 0.08) 40%, 
        rgba(255, 255, 255, 0.08) 60%,
        transparent 100%
    );
    transform: skewX(-45deg);
    z-index: 10;
   transition: none;
}

.frosted-card:hover::after{
    transform: translateX(350%) skewX(-45deg);; 
    transition: transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.frosted-card:hover {

    transform: scale(1.020) translateZ(0); 
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.7); 
}

.frosted-card :deep(.v-field__input) {
  background-color: #2D3748; 
  color: #F1F5F9; 
  border-radius: 4px;
 
}

.frosted-card .v-input input {
    color: #ffffff !important; 
    font-size: 1rem;
    padding-top: 10px;
}

.frosted-card .v-input__control {
    background-color: #2a2a2a !important; 
    border-radius: 4px;
    padding: 5px 10px;
}

.frosted-card .v-input--text-field {
    margin-bottom: 20px;
}


.primary-action-btn:hover {
    opacity: 0.9;
    transform: translateY(-1px); 
border-bottom: 2px solid hsla(151, 100%, 95%, 1.00); 

}


.secondary-action-btn:hover {
    color: #ffffff !important; 
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

.v-card-title {
    color: hsla(276, 70%, 91%, 0.897) !important;
    position: relative;
    padding-bottom: 20px; 
       font-family: 'Cutive Mono', monospace !important; 
    font-weight: 200 ;
    letter-spacing: 1px;
}

.v-text-field{
    font-family: 'Cutive Mono', monospace !important; 
    font-weight: 400 ;
    letter-spacing: 1px;

}

.v-toolbar-title {
    letter-spacing: 1px;
}

.gradient-bar{

    background: linear-gradient(
         90deg, 
    #5e0735 0%,     
    rgba(100, 27, 56, 1) 50%,    
    #b4325e 100% 
    ) !important; 
}

.minimal-nav {
    /* El fons ha de ser fosc, gairebé transparent o negre sòlid */
    background-color: rgba(18, 18, 18, 0.95) !important; 
    border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important; /* Línia de separació molt subtil */
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

.nav-profile-icon .v-icon {
    color: rgba(255, 255, 255, 0.5) !important; 
}

.nav-profile-icon:hover .v-icon {
    color: #ffffff !important; 
}
</style>
