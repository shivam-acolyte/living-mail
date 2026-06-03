import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
   path: path.join(__dirname, ".env")
});

import app from "./src/app.js";
import connectDB from "./src/config/db.js";
import { closePostgres } from "./src/config/postgres.js";
import {
   startBulkEmailWorker,
   stopBulkEmailWorker
} from "./src/services/bulkEmailService.js";

await connectDB();

if (process.env.DISABLE_BULK_EMAIL_WORKER === "true") {
   console.log("Bulk email worker disabled");
} else {
   startBulkEmailWorker();
}

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
   console.log(`Server Running On Port ${PORT}`);
});

const shutdown = async (signal) => {
   console.log(`${signal} received. Shutting down API server...`);

   server.close(async () => {
      if (process.env.DISABLE_BULK_EMAIL_WORKER !== "true") {
         await stopBulkEmailWorker();
      }

      await closePostgres();
      console.log("API server shutdown complete");
      process.exit(0);
   });

   setTimeout(() => {
      console.error("Forced API shutdown after timeout");
      process.exit(1);
   }, Number(process.env.SHUTDOWN_TIMEOUT_MS || 30000)).unref();
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
