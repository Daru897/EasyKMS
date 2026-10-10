import { test, expect, request } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { once } from "node:events";

test("standalone server retains workspace changes across a process restart", async () => {
  const directory = await mkdtemp(join(tmpdir(), "easykms-persistence-"));
  const baseURL = "http://127.0.0.1:3011";
  let child: ChildProcess | undefined;
  const client = await request.newContext({ baseURL });
  async function start() {
    child = spawn(process.execPath, [resolve(".next/standalone/server.js")], {
      env: {
        ...process.env,
        HOSTNAME: "127.0.0.1",
        PORT: "3011",
        APP_ORIGIN: baseURL,
        DATABASE_PATH: join(directory, "demo.sqlite"),
      },
      stdio: "ignore",
    });
    await expect
      .poll(async () => {
        if (child?.exitCode !== null) return false;
        try {
          return (await client.get("/api/health")).ok();
        } catch {
          return false;
        }
      })
      .toBeTruthy();
  }
  async function stop() {
    if (child && child.exitCode === null) {
      const exited = once(child, "exit");
      child.kill("SIGTERM");
      await exited;
    }
    child = undefined;
  }
  try {
    await start();
    await client.get("/api/workspace");
    const saved = await client.post("/api/workspace", {
      headers: { origin: baseURL },
      data: {
        action: "create",
        article: {
          title: "Restart persistence proof",
          category: "Agent playbooks",
          summary: "A persisted test policy.",
          content: "This draft must survive a process restart.",
          reviewDate: "2099-12-31",
        },
      },
    });
    expect(saved.ok()).toBeTruthy();
    const { articleId } = await saved.json();
    await stop();
    await start();
    const loaded = await client.get("/api/workspace");
    expect(
      (await loaded.json()).state.articles.some(
        (a: { id: string }) => a.id === articleId,
      ),
    ).toBeTruthy();
  } finally {
    await stop();
    await client.dispose();
    await rm(directory, { recursive: true, force: true });
  }
});
