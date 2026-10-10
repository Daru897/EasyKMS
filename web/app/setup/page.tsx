"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import PublicShell from "@/components/public-shell";
import ImportPanel from "@/components/import-panel";
import type { Action } from "@/lib/actions";
export default function Setup() {
  const [name, setName] = useState("");
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    fetch("/api/workspace")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setName(d.state.profile?.name || "My support team");
        setReady(true);
      })
      .catch((e) => setMessage(e.message));
  }, []);
  async function send(action: Action) {
    const r = await fetch("/api/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    return d;
  }
  return (
    <PublicShell>
      <main className="public-main narrow">
        <p className="eyebrow">FIRST-RUN SETUP</p>
        <h1>A workspace that feels like yours.</h1>
        <p className="hero-description">
          Configure your anonymous demo, then bring in sample knowledge. For a
          persistent team with real sign-in,{" "}
          <Link href="/team">create a team workspace</Link>.
        </p>
        <form
          className="setup-card"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await send({ action: "setup", name });
              setMessage(
                "Workspace name saved. Your existing policies are unchanged.",
              );
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "Unable to save");
            }
          }}
        >
          <h2>1. Name your workspace</h2>
          <label>
            Workspace name
            <input
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <button className="button primary" disabled={!ready}>
            Save workspace name
          </button>
          {message && <p role="status">{message}</p>}
        </form>
        {ready && <ImportPanel send={send} />}
        <div className="setup-card">
          <h2>3. Review, then publish</h2>
          <p>
            Imported knowledge is never published automatically. Review the
            drafts and approve the ones your team should use.
          </p>
          <Link href="/demo#library" className="button primary">
            Open your library →
          </Link>
        </div>
      </main>
    </PublicShell>
  );
}
