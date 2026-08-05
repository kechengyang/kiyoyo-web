import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pool } from "./db.js";

async function main() {
  const directory = resolve(process.cwd(), "migrations");
  const files = (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort();
  const client = await pool.connect();
  try {
    await client.query("create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now())");
    for (const file of files) {
      const exists = await client.query("select 1 from schema_migrations where version = $1", [file]);
      if (exists.rowCount) continue;
      const sql = await readFile(resolve(directory, file), "utf8");
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into schema_migrations(version) values ($1)", [file]);
        await client.query("commit");
        console.log(`Applied ${file}`);
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
