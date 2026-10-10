import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
for (const name of ["../.env.local", "../.env"]) {
  const path = fileURLToPath(new URL(name, import.meta.url));
  if (existsSync(path)) process.loadEnvFile(path);
}
const child = spawn(
  process.execPath,
  [fileURLToPath(new URL("../.next/standalone/server.js", import.meta.url))],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_PATH:
        process.env.DATABASE_PATH ||
        fileURLToPath(new URL("../data/easykms.sqlite", import.meta.url)),
      HOSTNAME: process.env.HOSTNAME || "127.0.0.1",
      PORT: process.env.PORT || "3000",
    },
  },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 0;
});
