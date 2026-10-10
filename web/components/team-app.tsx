"use client";
import { useEffect, useState } from "react";
import {
  createClient,
  type SupabaseClient,
  type Session,
} from "@supabase/supabase-js";
import PublicShell from "./public-shell";
import ImportPanel from "./import-panel";
import type { Workspace, Article, SearchResult } from "@/lib/types";
import type { Action } from "@/lib/actions";
import type { Role } from "@/lib/team/permissions";
import type { ImportedArticle } from "@/lib/imports";
type Config = {
  enabled: boolean;
  url?: string;
  key?: string;
  drive: boolean;
  ai: boolean;
};
type Team = { id: string; name: string; role: Role };
type Data = {
  state: Workspace;
  role: Role;
  members: { user_id: string; email: string; role: Role }[];
};
export default function TeamApp() {
  const [config, setConfig] = useState<Config | null>(null);
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("Assist");
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<Article | "new" | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [summary, setSummary] = useState("");
  const [invite, setInvite] = useState("");
  const [driveFiles, setDriveFiles] = useState<
    { id: string; name: string; mimeType: string }[]
  >([]);
  const [nextPage, setNextPage] = useState<string | undefined>();
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    fetch("/api/auth/config")
      .then((r) => r.json())
      .then(async (c: Config) => {
        if (!active) return;
        setConfig(c);
        if (c.enabled) {
          const auth = createClient(c.url!, c.key!);
          setClient(auth);
          const {
            data: { subscription },
          } = auth.auth.onAuthStateChange((_event, s) => setSession(s));
          unsubscribe = () => subscription.unsubscribe();
          const { data } = await auth.auth.getSession();
          if (active) setSession(data.session);
        }
      })
      .catch(() => setMessage("Unable to load sign-in configuration."));
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);
  useEffect(() => {
    if (!session) return;
    fetch("/api/team", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error);
        setTeams(body.teams);
      })
      .catch((e) => setMessage(e.message));
  }, [session]);
  async function request(path: string, body?: unknown) {
    if (!client) throw new Error("Sign in first.");
    const {
      data: { session: current },
    } = await client.auth.getSession();
    if (!current) throw new Error("Your session expired. Sign in again.");
    const response = await fetch(path, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${current.access_token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const output = await response.json();
    if (!response.ok) throw new Error(output.error || "Request failed.");
    return output;
  }
  async function load(id: string) {
    const output = await request(`/api/team?team=${id}`);
    setTeamId(id);
    setData(output);
    setResult(null);
    setSelected(null);
    setEditing(null);
  }
  async function run(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await work();
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Unable to complete request.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function mutate(input: Action): Promise<{
    preview?: ImportedArticle[];
    imported?: number;
    result?: SearchResult;
    articleId?: string;
  }> {
    const output = await request("/api/team", {
      operation: "mutate",
      teamId,
      input,
    });
    setData((old) => (old ? { ...old, state: output.state } : null));
    if (["publish", "archive"].includes(input.action)) setResult(null);
    return output;
  }
  const role = data?.role;
  const editor = role === "owner" || role === "editor";
  const reviewer = role === "owner" || role === "reviewer";
  const article = data?.state.articles.find((a) => a.id === selected);
  function action(input: Action) {
    void run(async () => {
      await mutate(input);
      setMessage("Saved.");
    });
  }
  return (
    <PublicShell>
      <main className="public-main team-page">
        <p className="eyebrow">A REAL WORKSPACE FOR YOUR TEAM</p>
        <h1>Knowledge, with the right access.</h1>
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
        {!config ? (
          <p>Checking deployment configuration…</p>
        ) : !config.enabled ? (
          <section className="setup-card">
            <h2>Team mode is ready to configure</h2>
            <p>
              This deployment needs a managed Postgres connection and Supabase
              Auth configuration. No account has been provisioned automatically.
            </p>
            <p>
              Set DATABASE_URL, SUPABASE_URL, and SUPABASE_ANON_KEY on the
              server, apply the included migration, and configure the sign-in
              redirect URL. Deployment instructions are in the repository.
            </p>
            <a href="/demo" className="button primary">
              Continue to the anonymous demo →
            </a>
          </section>
        ) : !session ? (
          <form
            className="setup-card"
            onSubmit={(e) => {
              e.preventDefault();
              const email = String(new FormData(e.currentTarget).get("email"));
              void run(async () => {
                const { error } = await client!.auth.signInWithOtp({
                  email,
                  options: {
                    emailRedirectTo: window.location.origin + "/team",
                  },
                });
                if (error) throw error;
                setMessage(
                  "Check your email for a secure sign-in link. It also creates your account if needed.",
                );
              });
            }}
          >
            <h2>Sign in with a secure email link</h2>
            <label>
              Email address
              <input name="email" type="email" required autoComplete="email" />
            </label>
            <button className="button primary" disabled={busy}>
              Send sign-in link
            </button>
            <p>
              Your deployment’s authentication provider handles identity and
              email verification.
            </p>
          </form>
        ) : (
          <>
            <div className="team-actions">
              <span>Signed in as {session.user.email}</span>
              <button
                className="button secondary"
                onClick={() =>
                  void run(async () => {
                    await client!.auth.signOut();
                    setData(null);
                    setTeams([]);
                    setSession(null);
                  })
                }
              >
                Sign out
              </button>
            </div>
            <div className="setup-grid">
              <section className="setup-card">
                <h2>Your workspaces</h2>
                {teams.length ? (
                  teams.map((t) => (
                    <button
                      key={t.id}
                      className="settings-action"
                      onClick={() => void run(() => load(t.id))}
                    >
                      <span>{t.name}</span>
                      <span>{t.role} →</span>
                    </button>
                  ))
                ) : (
                  <p>
                    Create a workspace or accept an invitation to get started.
                  </p>
                )}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const name = String(
                      new FormData(e.currentTarget).get("name"),
                    );
                    void run(async () => {
                      const output = await request("/api/team", {
                        operation: "create",
                        name,
                      });
                      setTeams((await request("/api/team")).teams);
                      await load(output.teamId);
                    });
                  }}
                >
                  <label>
                    New workspace name
                    <input name="name" required maxLength={80} />
                  </label>
                  <button className="button primary" disabled={busy}>
                    Create empty workspace
                  </button>
                </form>
              </section>
              <form
                className="setup-card"
                onSubmit={(e) => {
                  e.preventDefault();
                  const token = String(
                    new FormData(e.currentTarget).get("token"),
                  ).trim();
                  void run(async () => {
                    const output = await request("/api/team", {
                      operation: "join",
                      token,
                    });
                    setTeams((await request("/api/team")).teams);
                    await load(output.teamId);
                  });
                }}
              >
                <h2>Accept an invitation</h2>
                <p>
                  Use the invitation token shared by your workspace owner. Sign
                  in with the invited email address.
                </p>
                <label>
                  Invitation token
                  <input
                    name="token"
                    required
                    minLength={64}
                    maxLength={64}
                    autoComplete="off"
                  />
                </label>
                <button className="button secondary" disabled={busy}>
                  Join workspace
                </button>
              </form>
            </div>
            {data && (
              <>
                <div className="section-heading">
                  <h2>{data.state.profile?.name}</h2>
                  <span className="badge status-published">
                    Your role: {role}
                  </span>
                </div>
                <nav className="team-tabs" aria-label="Team views">
                  {[
                    "Assist",
                    "Knowledge",
                    ...(role !== "agent" ? ["Gaps"] : []),
                    "Members",
                    ...(editor ? ["Imports & Drive"] : []),
                  ].map((t) => (
                    <button
                      key={t}
                      className={`button ${tab === t ? "primary" : "secondary"}`}
                      aria-pressed={tab === t}
                      onClick={() => setTab(t)}
                    >
                      {t}
                    </button>
                  ))}
                </nav>
                {tab === "Assist" && (
                  <section className="setup-card">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const question = String(
                          new FormData(e.currentTarget).get("question"),
                        );
                        void run(async () => {
                          const output = await mutate({
                            action: "query",
                            question,
                          });
                          setResult(output.result!);
                          setSummary("");
                        });
                      }}
                    >
                      <label>
                        Support question
                        <textarea
                          name="question"
                          required
                          maxLength={600}
                          rows={3}
                        />
                      </label>
                      <button className="button primary" disabled={busy}>
                        Search published knowledge
                      </button>
                    </form>
                    {result && (
                      <div>
                        <h3>
                          {result.sources.length
                            ? "Published source excerpts"
                            : "No matching approved knowledge"}
                        </h3>
                        {!result.sources.length && (
                          <p>
                            Your question has been recorded as a knowledge gap.
                          </p>
                        )}
                        {result.sources.map((a) => (
                          <article key={a.id} className="source-answer">
                            <h3>
                              {a.title} · v{a.version}
                            </h3>
                            <p className="policy-content">{a.content}</p>
                          </article>
                        ))}
                        {result.sources.length > 0 && (
                          <div className="team-actions">
                            <button
                              className="button secondary"
                              disabled={busy}
                              onClick={() =>
                                action({
                                  action: "feedback",
                                  id: result.id,
                                  value: "helpful",
                                })
                              }
                            >
                              Helpful
                            </button>
                            <button
                              className="button secondary"
                              disabled={busy}
                              onClick={() =>
                                action({
                                  action: "feedback",
                                  id: result.id,
                                  value: "unhelpful",
                                })
                              }
                            >
                              Not helpful
                            </button>
                            {config.ai && (
                              <button
                                className="button secondary"
                                disabled={busy}
                                onClick={() =>
                                  void run(async () => {
                                    const output = await request(
                                      "/api/team/ai",
                                      { teamId, question: result.question },
                                    );
                                    setSummary(
                                      output.answer
                                        ? output.answer +
                                            "\n\n" +
                                            output.sources
                                              .map(
                                                (s: {
                                                  source: number;
                                                  title: string;
                                                  version: number;
                                                }) =>
                                                  `[${s.source}] ${s.title} · v${s.version}`,
                                              )
                                              .join("\n") +
                                            "\n\n" +
                                            output.citations
                                              .map(
                                                (c: {
                                                  source: number;
                                                  quote: string;
                                                }) =>
                                                  `[${c.source}] Evidence: ${c.quote}`,
                                              )
                                              .join("\n")
                                        : "The model abstained. Please use the source excerpts.",
                                    );
                                  })
                                }
                              >
                                Generate a cited AI summary
                              </button>
                            )}
                          </div>
                        )}
                        {config.ai && result.sources.length === 0 && (
                          <button
                            className="button secondary"
                            disabled={busy}
                            onClick={() =>
                              void run(async () => {
                                const output = await request("/api/team/ai", {
                                  teamId,
                                  question: result.question,
                                });
                                setSummary(
                                  output.answer
                                    ? output.answer +
                                        "\n" +
                                        output.sources
                                          .map(
                                            (s: {
                                              source: number;
                                              title: string;
                                            }) => `[${s.source}] ${s.title}`,
                                          )
                                          .join("\n")
                                    : "The model also abstained.",
                                );
                              })
                            }
                          >
                            Try AI-assisted retrieval
                          </button>
                        )}
                        {summary && (
                          <div className="notice">
                            <p>
                              <strong>
                                AI-generated summary — verify against the
                                policy.
                              </strong>
                              <br />
                              <span style={{ whiteSpace: "pre-wrap" }}>
                                {summary}
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                )}
                {tab === "Knowledge" && (
                  <>
                    <div className="team-actions">
                      {editor && (
                        <button
                          className="button primary"
                          onClick={() => setEditing("new")}
                        >
                          Create policy
                        </button>
                      )}
                      <span>{data.state.articles.length} visible policies</span>
                    </div>
                    <div className="recent-list">
                      {data.state.articles.map((a) => (
                        <button
                          className="recent-row"
                          key={a.id}
                          onClick={() => {
                            setSelected(a.id);
                            setEditing(null);
                          }}
                        >
                          <span className="recent-title">
                            <strong>{a.title}</strong>
                            <small>
                              {a.category} · v{a.version}
                            </small>
                          </span>
                          <span>{a.status}</span>
                        </button>
                      ))}
                    </div>
                    {article && !editing && (
                      <section className="setup-card">
                        <h2>{article.title}</h2>
                        <p className="muted">
                          {article.status} · author {article.owner}
                        </p>
                        <p className="policy-content">{article.content}</p>
                        <div className="team-actions">
                          {editor && article.status === "Draft" && (
                            <>
                              <button
                                className="button secondary"
                                onClick={() => setEditing(article)}
                              >
                                Edit draft
                              </button>
                              <button
                                className="button primary"
                                disabled={busy}
                                onClick={() =>
                                  action({ action: "submit", id: article.id })
                                }
                              >
                                Submit for review
                              </button>
                            </>
                          )}
                          {editor && article.status === "Published" && (
                            <button
                              className="button secondary"
                              disabled={busy}
                              onClick={() =>
                                void run(async () => {
                                  const output = await mutate({
                                    action: "revise",
                                    id: article.id,
                                  });
                                  setSelected(output.articleId!);
                                })
                              }
                            >
                              Create revision
                            </button>
                          )}
                          {reviewer && article.status === "In review" && (
                            <>
                              <button
                                className="button secondary"
                                disabled={busy}
                                onClick={() =>
                                  action({ action: "reject", id: article.id })
                                }
                              >
                                Request changes
                              </button>
                              <button
                                className="button primary"
                                disabled={
                                  busy || article.authorId === session.user.id
                                }
                                onClick={() =>
                                  action({ action: "publish", id: article.id })
                                }
                              >
                                Approve & publish
                              </button>
                              {article.authorId === session.user.id && (
                                <p>
                                  A different reviewer must approve your policy.
                                </p>
                              )}
                            </>
                          )}
                          {reviewer && article.status === "Published" && (
                            <button
                              className="button secondary"
                              disabled={busy}
                              onClick={() =>
                                action({ action: "archive", id: article.id })
                              }
                            >
                              Archive
                            </button>
                          )}
                        </div>
                      </section>
                    )}
                    {editing && (
                      <form
                        className="setup-card"
                        key={editing === "new" ? "new" : editing.id}
                        onSubmit={(e) => {
                          e.preventDefault();
                          const f = new FormData(e.currentTarget);
                          const fields = {
                            title: String(f.get("title")),
                            summary: String(f.get("summary")),
                            content: String(f.get("content")),
                            category: String(
                              f.get("category"),
                            ) as "Agent playbooks",
                            reviewDate: String(f.get("reviewDate")),
                          };
                          void run(async () => {
                            const output = await mutate(
                              editing === "new"
                                ? { action: "create", article: fields }
                                : {
                                    action: "update",
                                    id: editing.id,
                                    article: fields,
                                  },
                            );
                            setSelected(
                              output.articleId ||
                                (editing === "new" ? null : editing.id),
                            );
                            setEditing(null);
                          });
                        }}
                      >
                        <h2>
                          {editing === "new" ? "Create policy" : "Edit draft"}
                        </h2>
                        <label>
                          Title
                          <input
                            name="title"
                            required
                            maxLength={160}
                            defaultValue={
                              editing === "new" ? "" : editing.title
                            }
                          />
                        </label>
                        <label>
                          Collection
                          <select
                            name="category"
                            defaultValue={
                              editing === "new"
                                ? "Agent playbooks"
                                : editing.category
                            }
                          >
                            {[
                              "Agent playbooks",
                              "Billing & payments",
                              "Account & security",
                              "Orders & shipping",
                            ].map((c) => (
                              <option key={c}>{c}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Summary
                          <input
                            name="summary"
                            required
                            maxLength={300}
                            defaultValue={
                              editing === "new" ? "" : editing.summary
                            }
                          />
                        </label>
                        <label>
                          Content
                          <textarea
                            name="content"
                            required
                            maxLength={20000}
                            rows={10}
                            defaultValue={
                              editing === "new" ? "" : editing.content
                            }
                          />
                        </label>
                        <label>
                          Review by
                          <input
                            name="reviewDate"
                            type="date"
                            required
                            defaultValue={
                              editing === "new" ? "" : editing.reviewDate
                            }
                          />
                        </label>
                        <div className="team-actions">
                          <button className="button primary" disabled={busy}>
                            Save draft
                          </button>
                          <button
                            type="button"
                            className="button secondary"
                            onClick={() => setEditing(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </>
                )}
                {tab === "Gaps" &&
                  data.state.gaps.map((g) => (
                    <form
                      className="setup-card"
                      key={g.id}
                      onSubmit={(e) => {
                        e.preventDefault();
                        action({
                          action: "resolve",
                          id: g.id,
                          articleId: String(
                            new FormData(e.currentTarget).get("article"),
                          ),
                        });
                      }}
                    >
                      <h3>{g.question}</h3>
                      <p>
                        {g.status} · {g.count} requests
                      </p>
                      {g.status === "Open" && (
                        <>
                          <label>
                            Answering policy
                            <select name="article" required>
                              <option value="">Choose published policy</option>
                              {data.state.articles
                                .filter((a) => a.status === "Published")
                                .map((a) => (
                                  <option key={a.id} value={a.id}>
                                    {a.title}
                                  </option>
                                ))}
                            </select>
                          </label>
                          <button className="button secondary" disabled={busy}>
                            Resolve gap
                          </button>
                        </>
                      )}
                    </form>
                  ))}
                {tab === "Members" && (
                  <section className="setup-card">
                    <h2>Team access</h2>
                    <p>
                      Editors create and submit policies. Reviewers approve
                      other people’s work. Agents access published knowledge.
                      Owners manage membership.
                    </p>
                    {role === "owner" ? (
                      <>
                        {data.members.map((m) => (
                          <div className="member-row" key={m.user_id}>
                            <span>
                              {m.email} · {m.role}
                            </span>
                            {m.role !== "owner" && (
                              <button
                                className="button secondary"
                                onClick={() =>
                                  void run(async () => {
                                    await request("/api/team", {
                                      operation: "remove",
                                      teamId,
                                      userId: m.user_id,
                                    });
                                    await load(teamId);
                                  })
                                }
                              >
                                Remove member
                              </button>
                            )}
                          </div>
                        ))}
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const f = new FormData(e.currentTarget);
                            void run(async () => {
                              const output = await request("/api/team", {
                                operation: "invite",
                                teamId,
                                email: f.get("email"),
                                role: f.get("role"),
                              });
                              setInvite(output.invitationToken);
                            });
                          }}
                        >
                          <label>
                            Invite email
                            <input name="email" type="email" required />
                          </label>
                          <label>
                            Role
                            <select name="role">
                              <option value="agent">Agent</option>
                              <option value="editor">Editor</option>
                              <option value="reviewer">Reviewer</option>
                            </select>
                          </label>
                          <button className="button primary" disabled={busy}>
                            Create invitation
                          </button>
                        </form>
                        {invite && (
                          <label>
                            Share this token securely with the invited person
                            <input
                              readOnly
                              value={invite}
                              onFocus={(e) => e.target.select()}
                            />
                            <small>
                              Expires in seven days. No email is sent
                              automatically.
                            </small>
                          </label>
                        )}
                      </>
                    ) : (
                      <p>
                        Your role is {role}. Contact your owner to change
                        membership.
                      </p>
                    )}
                  </section>
                )}
                {tab === "Imports & Drive" && editor && (
                  <>
                    <ImportPanel send={mutate} />
                    <section className="setup-card">
                      <h2>Google Drive</h2>
                      <p>
                        Import selected Google Docs or text files as drafts.
                        Existing published knowledge is never overwritten
                        automatically. This is a manual import, not background
                        synchronization.
                      </p>
                      {!config.drive ? (
                        <p>
                          Configure Google OAuth and the server encryption key
                          to enable this connection.
                        </p>
                      ) : (
                        <>
                          <button
                            className="button secondary"
                            disabled={busy}
                            onClick={() =>
                              void run(async () => {
                                const { error } =
                                  await client!.auth.signInWithOAuth({
                                    provider: "google",
                                    options: {
                                      redirectTo:
                                        window.location.origin + "/team",
                                      scopes:
                                        "https://www.googleapis.com/auth/drive.readonly",
                                      queryParams: {
                                        access_type: "offline",
                                        prompt: "consent",
                                      },
                                    },
                                  });
                                if (error) throw error;
                              })
                            }
                          >
                            Connect Google Drive
                          </button>
                          {session.provider_token && (
                            <button
                              className="button primary"
                              disabled={busy}
                              onClick={() =>
                                void run(async () => {
                                  await request("/api/team/drive", {
                                    operation: "connect",
                                    teamId,
                                    accessToken: session.provider_token,
                                    refreshToken:
                                      session.provider_refresh_token ||
                                      undefined,
                                  });
                                  setMessage(
                                    "Google connection saved for your membership in this workspace.",
                                  );
                                })
                              }
                            >
                              Save Google connection to this workspace
                            </button>
                          )}
                          <div className="team-actions">
                            <button
                              className="button secondary"
                              disabled={busy}
                              onClick={() =>
                                void run(async () => {
                                  const output = await request(
                                    "/api/team/drive",
                                    { operation: "list", teamId },
                                  );
                                  setDriveFiles(output.files);
                                  setNextPage(output.nextPageToken);
                                })
                              }
                            >
                              Browse importable files
                            </button>
                            <button
                              className="button secondary"
                              disabled={busy}
                              onClick={() =>
                                void run(async () => {
                                  await request("/api/team/drive", {
                                    operation: "disconnect",
                                    teamId,
                                  });
                                  setDriveFiles([]);
                                  setMessage(
                                    "Stored Google connection removed. You can also revoke app access in Google Account settings.",
                                  );
                                })
                              }
                            >
                              Disconnect
                            </button>
                          </div>
                          {driveFiles.map((f) => (
                            <div className="member-row" key={f.id}>
                              <span>{f.name}</span>
                              <button
                                className="button secondary"
                                disabled={busy}
                                onClick={() =>
                                  void run(async () => {
                                    const output = await request(
                                      "/api/team/drive",
                                      {
                                        operation: "import",
                                        teamId,
                                        fileId: f.id,
                                      },
                                    );
                                    await load(teamId);
                                    setMessage(output.message);
                                  })
                                }
                              >
                                Import draft
                              </button>
                            </div>
                          ))}
                          {nextPage && (
                            <button
                              className="button secondary"
                              disabled={busy}
                              onClick={() =>
                                void run(async () => {
                                  const output = await request(
                                    "/api/team/drive",
                                    {
                                      operation: "list",
                                      teamId,
                                      pageToken: nextPage,
                                    },
                                  );
                                  setDriveFiles((old) => [
                                    ...old,
                                    ...output.files,
                                  ]);
                                  setNextPage(output.nextPageToken);
                                })
                              }
                            >
                              Load more files
                            </button>
                          )}
                        </>
                      )}
                    </section>
                  </>
                )}
              </>
            )}
          </>
        )}
      </main>
    </PublicShell>
  );
}
