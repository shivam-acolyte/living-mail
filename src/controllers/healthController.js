import { getPostgresHealth } from "../config/postgres.js";

export const healthCheck = async (req, res) => {
  const postgres = await getPostgresHealth();
  const ok = postgres.ok;

  return res.status(ok ? 200 : 503).json({
    success: ok,
    service: "tracking-server",
    timestamp: new Date().toISOString(),
    checks: {
      postgres,
      bulkEmailWorker: {
        ok: true,
        queue: "postgresql",
        enabled: process.env.DISABLE_BULK_EMAIL_WORKER !== "true"
      }
    }
  });
};
