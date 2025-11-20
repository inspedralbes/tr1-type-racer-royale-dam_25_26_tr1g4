# FitAI 🏋️‍♂️🎮

**FitAI** és una plataforma de jocs de fitness multijugador en temps real que transforma l'exercici físic en una experiència competitiva. Els usuaris poden crear o unir-se a sales de joc, realitzar exercicis físics mentre són monitoritzats per un model d'aprenentatge automàtic (ML) al navegador i competir contra altres jugadors en sessions sincronitzades de 60 segons.

## 📖 Descripció del Projecte

Aquest projecte combina l'activitat física amb la gamificació. Utilitzant la càmera del dispositiu i tecnologia de detecció de postures (Pose Detection), el sistema analitza la forma de l'usuari i compta les repeticions vàlides d'exercicis com esquats o flexions. L'objectiu és motivar els usuaris a fer exercici mitjançant la competència en temps real, registres personals i taules de classificació globals.

## ✨ Característiques Principals

* **Multijugador en Temps Real:** Competeix contra fins a 4 jugadors simultàniament en sales sincronitzades mitjançant WebSockets.
* **Detecció de Postures (IA):** Utilitza TensorFlow.js i PoseNet per analitzar els teus moviments i comptar repeticions vàlidament directament des del navegador.
* **Gestió de Sales:** Crea sales privades o uneix-te a sales públiques existents.
* **Exercicis Variats:** Suport per a exercicis com esquats, flexions i més.
* **Classificacions i Estadístiques:** Historial de rècords personals i taules de classificació global.
* **Xat en Viu:** Comunica't amb altres jugadors a la sala abans i durant la partida.

## 🛠️ Tecnologies Utilitzades

El projecte utilitza una arquitectura client-servidor moderna i contenidoritzada:

### Frontend
* **Framework:** Vue 3 + Vuetify
* **Estat:** Pinia (Gestió d'estat i WebSockets)
* **Routing:** Vue Router
* **IA/ML:** TensorFlow.js + PoseNet (Detecció de postures)

### Backend
* **Servidor:** Node.js 18 + Express
* **Temps Real:** WebSocket (`ws` package)
* **Base de Dades:** MySQL 8.0
* **ORM:** Sequelize (per a usuaris) i SQL natiu (per a mètriques de joc)

### Infraestructura
* **Proxy:** Nginx
* **Contenidors:** Docker i Docker Compose
* **CI/CD:** GitHub Actions

## 👥 Autors

Aquest projecte ha estat desenvolupat pel grup **TR1G4**:

* **Judit Sarrat**
* **Jordi Rocha**
* **Harsh Gautambhai**
* **Nil Diaz**

---
*Desenvolupat com a part del projecte TR1 - DAM 2025-2026.*
