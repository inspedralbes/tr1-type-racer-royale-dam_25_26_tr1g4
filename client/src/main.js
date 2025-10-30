/**
 * main.js
 *
 * Bootstraps Vuetify and other plugins then mounts the App`


// Plugins
import { registerPlugins } from '@/plugins'

// Components
import App from './App.vue'

// Composables
import { createApp } from 'vue'

// Styles
import 'unfonts.css'

const app = createApp(App)

registerPlugins(app)

app.mount('#app')
*/
import { createApp } from 'vue';
import App from './App.vue';
import { createPinia } from 'pinia';
import router from './router';
import vuetify from './plugins/vuetify'; // 👈 import it here

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(vuetify); // 👈 and register Vuetify before mount()

app.mount('#app');

