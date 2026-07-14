import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const run = async () => {
  const client = new pg.Client({
    connectionString: process.env.POSTGRES_URL
  });
  await client.connect();
  const res = await client.query("SELECT id, name, slug, subject, form_html FROM amp_templates WHERE form_html LIKE '%Find Accomodation%' OR form_html LIKE '%Acolyte%'");
  console.log("Matching templates count:", res.rows.length);
  for (const row of res.rows) {
    console.log(`ID: ${row.id}, Name: ${row.name}, Slug: ${row.slug}, Subject: ${row.subject}`);
  }
  await client.end();
};

run().catch(console.error);
