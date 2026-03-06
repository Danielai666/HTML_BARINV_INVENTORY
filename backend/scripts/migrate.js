const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

async function main(){
  const databaseUrl = process.env.DATABASE_URL;
  if(!databaseUrl) throw new Error("DATABASE_URL is required");

  const client = new Client({ connectionString: databaseUrl, ssl: process.env.PGSSLMODE ? { rejectUnauthorized: false } : undefined });
  await client.connect();

  const migrationsDir = path.join(__dirname, "..", "db", "migrations");
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith(".sql")).sort();

  // Migration bookkeeping
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  for(const f of files){
    const id = f;
    const already = await client.query("SELECT 1 FROM _migrations WHERE id=$1", [id]);
    if(already.rowCount) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, f), "utf8");
    console.log("Applying", f);
    await client.query("BEGIN");
    try{
      await client.query(sql);
      await client.query("INSERT INTO _migrations(id) VALUES($1)", [id]);
      await client.query("COMMIT");
    }catch(err){
      await client.query("ROLLBACK");
      throw err;
    }
  }

  await client.end();
  console.log("Migrations complete.");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
