import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export let postgres = null;
export let isPostgresConfigured = false;

const getConnectionString = () => process.env.DATABASE_URL || process.env.POSTGRES_URL;

const getPostgres = () => {
  if (postgres) {
    return postgres;
  }

  const connectionString = getConnectionString();
  isPostgresConfigured = Boolean(connectionString);

  if (!connectionString) {
    return null;
  }

  postgres = new Pool({
    connectionString,
      max: Number(process.env.POSTGRES_POOL_MAX || 10),
      idleTimeoutMillis: Number(process.env.POSTGRES_IDLE_TIMEOUT_MS || 30000),
      connectionTimeoutMillis: Number(process.env.POSTGRES_CONNECTION_TIMEOUT_MS || 15000),
      keepAlive: true
  });

  postgres.on("error", (error) => {
    console.error("POSTGRES POOL ERROR:", error.message);
  });

  return postgres;
};

export const connectPostgres = async ({ required = false } = {}) => {
  const pool = getPostgres();

  if (!pool) {
    if (required) {
      throw new Error("POSTGRES_URL or DATABASE_URL is required");
    }

    console.log("PostgreSQL not configured");
    return false;
  }

  await pool.query("SELECT 1");
  if (process.env.POSTGRES_AUTO_MIGRATE !== "false") {
    const schemaPath = path.resolve(__dirname, "../../db/postgres-schema.sql");

    if (fs.existsSync(schemaPath)) {
      await pool.query(fs.readFileSync(schemaPath, "utf8"));
    }
  }

  console.log("PostgreSQL Connected");
  return true;
};

export const closePostgres = async () => {
  if (postgres) {
    await postgres.end();
    postgres = null;
    isPostgresConfigured = Boolean(getConnectionString());
  }
};

export const getPostgresHealth = async () => {
  const pool = getPostgres();

  if (!pool) {
    return {
      ok: false,
      status: "not_configured"
    };
  }

  try {
    await pool.query("SELECT 1");

    return {
      ok: true,
      status: "connected"
    };
  } catch (error) {
    return {
      ok: false,
      status: "error",
      error: error.message
    };
  }
};
