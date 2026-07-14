import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const run = async () => {
  const client = new pg.Client({
    connectionString: process.env.POSTGRES_URL
  });
  await client.connect();
  const res = await client.query("SELECT tracking_id, email, subject, campaign_name, event_type, created_at FROM tracking_events ORDER BY created_at DESC LIMIT 10");
  console.log("Recent tracking events:");
  for (const row of res.rows) {
    console.log(row);
  }
  await client.end();
};

run().catch(console.error);
