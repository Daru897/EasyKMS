import { existsSync } from "node:fs";
for (const file of [".env.local", ".env"])
  if (existsSync(file)) process.loadEnvFile(file);
const has = (name) => Boolean(process.env[name]);
const team = ["DATABASE_URL", "SUPABASE_URL", "SUPABASE_ANON_KEY"];
const drive = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "TOKEN_ENCRYPTION_KEY",
];
console.log("Demo: available without cloud credentials.");
for (const [label, keys] of [
  ["Team mode", team],
  ["Drive import", drive],
  ["AI adapter", ["OPENAI_API_KEY", "AI_MODEL"]],
]) {
  const missing = keys.filter((k) => !has(k));
  console.log(
    `${label}: ${missing.length ? "missing " + missing.join(", ") : "configuration present (not connectivity-tested)"}`,
  );
}
if (team.some(has) && !team.every(has)) process.exitCode = 1;
if (
  has("TOKEN_ENCRYPTION_KEY") &&
  !/^[a-f0-9]{64}$/i.test(process.env.TOKEN_ENCRYPTION_KEY)
) {
  console.log(
    "TOKEN_ENCRYPTION_KEY must be exactly 64 hexadecimal characters.",
  );
  process.exitCode = 1;
}
console.log(
  `AI runtime: ${process.env.AI_EVALUATION_APPROVED === "true" ? "operator-enabled; verify evaluation report" : "disabled pending live evaluation and human review"}.`,
);
if (
  process.env.APP_ORIGIN?.startsWith("https://") &&
  process.env.COOKIE_SECURE !== "true"
) {
  console.log("Set COOKIE_SECURE=true for public HTTPS.");
  process.exitCode = 1;
}
