import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const run = async () => {
  const client = new pg.Client({
    connectionString: process.env.POSTGRES_URL
  });
  await client.connect();
  const res = await client.query("SELECT id, name, slug, form_html, source_json FROM amp_templates");
  console.log("Found " + res.rows.length + " templates.");
  for (const row of res.rows) {
    console.log(`ID: ${row.id}, Name: ${row.name}, Slug: ${row.slug}`);
    console.log("Source JSON keys:", Object.keys(row.source_json || {}));
    if (row.form_html) {
      console.log("Form HTML snippet:", row.form_html.substring(0, 1000));
    }
  }
  await client.end();
};

run().catch(console.error);
