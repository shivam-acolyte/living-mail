import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.join(__dirname, ".env")
});

const { default: connectDB } = await import("./src/config/db.js");
const { closePostgres } = await import("./src/config/postgres.js");
const {
  startBulkEmailWorker,
  stopBulkEmailWorker
} = await import("./src/services/bulkEmailService.js");

await connectDB();
startBulkEmailWorker();

console.log("Bulk email worker running");

const shutdown = async (signal) => {
  console.log(`${signal} received. Shutting down bulk email worker...`);

  try {
    await stopBulkEmailWorker();

    await closePostgres();
    console.log("Bulk email worker shutdown complete");
    process.exit(0);
  } catch (error) {
    console.error("Bulk email worker shutdown failed:", error);
    process.exit(1);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
