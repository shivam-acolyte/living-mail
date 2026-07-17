import { postgres, isPostgresBackedOff } from "../config/postgres.js";

const numberEnv = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const REFRESH_INTERVAL_MS = numberEnv(
  "MATERIALIZED_VIEW_REFRESH_INTERVAL_MS",
  5 * 60 * 1000 // default 5 minutes
);

let workerStarted = false;
let workerRunning = false;
let workerTimer = null;
let stopRequested = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const refreshMaterializedView = async () => {
  if (!postgres) {
    console.warn("MATERIALIZED VIEW REFRESH: Postgres not configured");
    return;
  }

  const start = Date.now();
  const concurrently = process.env.MATERIALIZED_VIEW_REFRESH_CONCURRENTLY !== "false";
  try {
    if (concurrently) {
      console.log("MATERIALIZED VIEW REFRESH: Starting concurrent refresh...");
      await postgres.query("REFRESH MATERIALIZED VIEW CONCURRENTLY tracking_events_hourly_summary");
    } else {
      console.log("MATERIALIZED VIEW REFRESH: Starting non-concurrent refresh...");
      await postgres.query("REFRESH MATERIALIZED VIEW tracking_events_hourly_summary");
    }
    console.log(`MATERIALIZED VIEW REFRESH: Completed successfully (took ${Date.now() - start}ms)`);
  } catch (error) {
    console.error(`MATERIALIZED VIEW REFRESH ERROR (took ${Date.now() - start}ms):`, error.message);
  }
};

const workerLoop = async () => {
  if (!workerStarted || stopRequested) {
    return;
  }

  if (workerRunning) {
    return;
  }

  if (isPostgresBackedOff()) {
    console.warn("MATERIALIZED VIEW REFRESH: Postgres is backed off, skipping refresh");
  } else {
    workerRunning = true;
    try {
      await refreshMaterializedView();
    } finally {
      workerRunning = false;
    }
  }

  if (workerStarted && !stopRequested) {
    workerTimer = setTimeout(workerLoop, REFRESH_INTERVAL_MS);
  }
};

export const startMaterializedViewWorker = () => {
  if (workerStarted || process.env.DISABLE_MATERIALIZED_VIEW_WORKER === "true") {
    return;
  }

  workerStarted = true;
  stopRequested = false;

  console.log(`Materialized view background refresh worker running every ${REFRESH_INTERVAL_MS}ms`);

  // Run first refresh immediately on startup after a small delay to let connections stabilize
  setTimeout(() => {
    workerLoop();
  }, 5000).unref();
};

export const stopMaterializedViewWorker = async () => {
  stopRequested = true;
  workerStarted = false;

  if (workerTimer) {
    clearTimeout(workerTimer);
    workerTimer = null;
  }

  while (workerRunning) {
    await sleep(250);
  }
  console.log("Materialized view background refresh worker stopped");
};
