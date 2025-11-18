require("dotenv").config();
const express = require("express");
const cors = require("cors");

const db = require("./config/database");
const createTables = require("./config/tables");
const userRoutes = require("./routes/userRoutes");
const { User } = require("./models/sequelize"); // --- CAMBIO --- Importamos el modelo User
const { checkGlobalRecord } = require("./ws/gameSocket"); // Ruta al teu mòdul de BD
const { logChatMessage } = require("./utils/chatLogger"); // Import logChatMessage
const initWebSocketHandler = require("./ws/websocketHandler"); // Import the new handler

const app = express();

const corsOptions = {
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
};

const nodeEnv = process.env.NODE_ENV;

// En producción, solo permite peticiones desde la URL del frontend definida en .env
if (nodeEnv === "production") {
  console.log("Running in production mode");
  if (process.env.FRONTEND_URL) {
    corsOptions.origin = process.env.FRONTEND_URL;
  } else {
    console.error(
      "ERROR: FRONTEND_URL is not set in the production environment. CORS will be restricted."
    );
    corsOptions.origin = false; // Disallow all origins if not set
  }
} else {
  console.log("Running in development mode");
  // En desarrollo, permite cualquier origen
  corsOptions.origin = "*";
}

app.use(cors(corsOptions));
app.use(express.json());
app.use("/api/users", userRoutes);
app.use("/api/stats", require("./routes/statsRoutes"));
app.use("/api", require("./routes/api"));

async function connectWithRetry(retries = 5, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      await createTables();
      console.log("✅ Database tables created or already exist.");
      return; // Success
    } catch (err) {
      console.error(
        `❌ Error connecting to database (attempt ${i + 1}/${retries}):`,
        err.message
      );
      if (i < retries - 1) {
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise((res) => setTimeout(res, delay));
      } else {
        throw new Error(
          "❌ Could not connect to the database after multiple retries."
        );
      }
    }
  }
}

async function startServer() {
  try {
    await connectWithRetry();
    const PORT = 3000;
    const server = app.listen(PORT, () => {
      console.log(
        `Servidor Express escoltant al port http://localhost:${PORT}`
      );
    });
    initWebSocketHandler(server, db, User, checkGlobalRecord, logChatMessage);
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
}

startServer();
