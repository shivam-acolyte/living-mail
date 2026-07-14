import pg from "pg";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

const run = async () => {
  const client = new pg.Client({
    connectionString: process.env.POSTGRES_URL
  });
  await client.connect();
  const res = await client.query("SELECT * FROM amp_templates WHERE id = 'b7f516b2-9d1c-4389-8a28-cabdc958868f'");
  if (res.rows.length > 0) {
    const row = res.rows[0];
    fs.writeFileSync("living_source.json", JSON.stringify(row.source_json, null, 2));
    fs.writeFileSync("living_form.html", row.form_html);
    console.log("Dumped living_source.json and living_form.html successfully.");
  } else {
    console.log("Template not found");
  }
  await client.end();
};

run().catch(console.error);
