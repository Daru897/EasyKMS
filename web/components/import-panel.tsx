"use client";
import { useState } from "react";
import type { Action } from "@/lib/actions";
import type { ImportedArticle } from "@/lib/imports";
export default function ImportPanel({
  send,
}: {
  send: (
    action: Action,
  ) => Promise<{ preview?: ImportedArticle[]; imported?: number } | null>;
}) {
  const [file, setFile] = useState<{
    filename: string;
    content: string;
  } | null>(null);
  const [preview, setPreview] = useState<ImportedArticle[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function choose(value: File | undefined) {
    setPreview([]);
    setMessage("");
    setFile(null);
    if (!value) return;
    if (value.size > 24000) {
      setMessage("Choose a file smaller than 24 KB.");
      return;
    }
    setFile({ filename: value.name, content: await value.text() });
  }
  async function run(dry: boolean) {
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await send({ action: "import", ...file, preview: dry });
      if (result?.preview) setPreview(result.preview);
      if (result?.imported) {
        setMessage(
          `${result.imported} policies imported as drafts. Submit them for review before searching.`,
        );
        setPreview([]);
        setFile(null);
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="setup-card">
      <h2>Bring your knowledge</h2>
      <p>
        Import a Markdown policy or a CSV with title and content columns.
        Preview first; every imported policy starts as a draft.
      </p>
      <p>
        <a className="text-button" href="/samples/policies.csv" download>
          Download sample CSV
        </a>{" "}
        ·{" "}
        <a className="text-button" href="/samples/policy.md" download>
          Download sample Markdown
        </a>
      </p>
      <label>
        Policy file
        <input
          type="file"
          accept=".md,.markdown,.csv"
          onChange={(e) => void choose(e.target.files?.[0])}
        />
      </label>
      <button
        className="button secondary"
        disabled={!file || busy}
        onClick={() => void run(true)}
      >
        Preview import
      </button>
      {preview.length > 0 && (
        <div>
          <h3>{preview.length} drafts ready</h3>
          <ul>
            {preview.map((a, i) => (
              <li key={i}>
                {a.title} · {a.category}
              </li>
            ))}
          </ul>
          <button
            className="button primary"
            disabled={busy}
            onClick={() => void run(false)}
          >
            Import {preview.length} drafts
          </button>
        </div>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
