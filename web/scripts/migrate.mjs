import postgres from "postgres";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
for (const name of [".env.local", ".env"])
  if (existsSync(name)) process.loadEnvFile(name);
if (!process.env.DATABASE_URL)
  throw new Error("Set DATABASE_URL before running migrations.");
const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  ssl: process.env.DATABASE_SSL === "disable" ? false : "require",
});
try {
  await sql.begin(async (tx) => {
    await tx.unsafe(
      await readFile(
        new URL("../migrations/001_teams.sql", import.meta.url),
        "utf8",
      ),
    );
  });
  console.log("Team schema migration applied.");
} finally {
  await sql.end();
}
