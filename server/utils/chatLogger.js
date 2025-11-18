const fs = require("fs").promises;
const path = require("path");

const CHAT_LOG_DIR = path.join(__dirname, "..", "chats"); // Adjust path relative to server/utils

async function logChatMessage(roomId, messageData) {
  try {
    await fs.mkdir(CHAT_LOG_DIR, { recursive: true });

    const logFile = path.join(CHAT_LOG_DIR, `${roomId}.json`);
    let logs = [];

    try {
      const data = await fs.readFile(logFile, "utf8");
      logs = JSON.parse(data);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }

    logs.push(messageData);

    await fs.writeFile(logFile, JSON.stringify(logs, null, 2), "utf8");
  } catch (error) {
    console.error(`Error logging chat message for room ${roomId}:`, error);
  }
}

module.exports = { logChatMessage };
