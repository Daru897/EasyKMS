"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Copy,
  FileText,
  FolderOpen,
  GitPullRequest,
  Layers3,
  Lightbulb,
  Menu,
  MessageSquareText,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react";
import type { Article, Workspace, SearchResult, Status } from "@/lib/types";
import type { Action } from "@/lib/actions";

type View =
  | "Agent assist"
  | "Knowledge library"
  | "Review queue"
  | "Knowledge gaps"
  | "Insights"
  | "Workspace";
const navigation: { name: View; icon: LucideIcon; key: string }[] = [
  { name: "Agent assist", icon: MessageSquareText, key: "assist" },
  { name: "Knowledge library", icon: BookOpen, key: "library" },
  { name: "Review queue", icon: GitPullRequest, key: "reviews" },
  { name: "Knowledge gaps", icon: Lightbulb, key: "gaps" },
  { name: "Insights", icon: TrendingUp, key: "insights" },
  { name: "Workspace", icon: Settings2, key: "workspace" },
];
const categories = [
  "Billing & payments",
  "Account & security",
  "Orders & shipping",
  "Agent playbooks",
];
const suggestions = [
  "What is our refund policy?",
  "How do I reset a password?",
  "My delivery is late",
];
const date = (value: string) =>
  new Date(value).toLocaleDateString("en", { month: "short", day: "numeric" });
function Badge({ status }: { status: Status }) {
  return (
    <span className={`badge status-${status.toLowerCase().replace(" ", "-")}`}>
      <span />
      {status}
    </span>
  );
}
function Empty({
  icon: Icon = Search,
  title,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty">
      <Icon size={30} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
function Dialog({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const el = ref.current;
    return () => el?.close();
  }, []);
  return (
    <dialog
      className={`dialog ${wide ? "wide" : ""}`}
      ref={ref}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-labelledby="dialog-heading"
    >
      <div className="dialog-head">
        <h2 id="dialog-heading">{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function Editor({
  article,
  onSave,
  onClose,
  busy,
  error,
}: {
  article?: Article;
  onSave: (values: Extract<Action, { action: "create" }>["article"]) => void;
  onClose: () => void;
  busy: boolean;
  error: string;
}) {
  const [defaultReviewDate] = useState(() =>
    new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
  );
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSave({
      title: String(data.get("title")),
      category: data.get("category") as Extract<
        Action,
        { action: "create" }
      >["article"]["category"],
      summary: String(data.get("summary")),
      content: String(data.get("content")),
      reviewDate: String(data.get("reviewDate")),
    });
  }
  return (
    <Dialog
      title={article ? "Edit policy draft" : "Create a policy"}
      onClose={onClose}
      wide
    >
      <form onSubmit={save} className="editor">
        <p className="muted">
          Start with the answer an agent needs. Only reviewed, published
          policies appear in search.
        </p>
        <label>
          Policy title
          <input
            name="title"
            defaultValue={article?.title}
            placeholder="e.g. Warranty coverage for accidental damage"
            required
            maxLength={160}
            autoFocus
          />
        </label>
        <div className="form-columns">
          <label>
            Collection
            <select
              name="category"
              defaultValue={article?.category || categories[0]}
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Review by
            <input
              name="reviewDate"
              type="date"
              defaultValue={article?.reviewDate || defaultReviewDate}
              required
            />
          </label>
        </div>
        <label>
          Short description
          <input
            name="summary"
            defaultValue={article?.summary}
            placeholder="What does this policy help an agent resolve?"
            required
            maxLength={300}
          />
        </label>
        <label>
          Policy content
          <textarea
            name="content"
            defaultValue={article?.content}
            placeholder="Include eligibility, steps, timelines, and escalation rules…"
            required
            rows={10}
            maxLength={20000}
          />
        </label>
        <p className="muted tiny">
          Use fictional information in this public demo. Plain text only;
          maximum 20,000 characters.
        </p>
        {error && (
          <p role="alert" className="inline-error">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? "Saving…" : "Save draft"}
            <Check size={16} />
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export default function WorkspaceApp() {
  const [todayMs] = useState(() => Date.now());
  const [state, setState] = useState<Workspace | null>(null);
  const [view, setView] = useState<View>("Agent assist");
  const [mobileNav, setMobileNav] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [filter, setFilter] = useState("");
  const [category, setCategory] = useState("All collections");
  const [status, setStatus] = useState("All statuses");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Article | "new" | null>(null);
  const [guide, setGuide] = useState(false);
  const [reset, setReset] = useState(false);
  const [toast, setToast] = useState("");
  const [resolveGap, setResolveGap] = useState<string | null>(null);
  const queryRef = useRef<HTMLTextAreaElement>(null);
  const loaded = useRef(false);
  const lock = useRef(false);
  const notify = (text: string) => setToast(text);
  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/workspace");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setState(data.state);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to load your workspace.",
      );
    }
  }, []);
  useEffect(() => {
    if (!loaded.current) {
      loaded.current = true;
      void load();
    }
  }, [load]);
  useEffect(() => {
    const sync = () => {
      const page = navigation.find((n) => "#" + n.key === window.location.hash);
      if (page) setView(page.name);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setView("Agent assist");
        window.location.hash = "assist";
        setTimeout(() => queryRef.current?.focus(), 0);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  function navigate(next: View) {
    setView(next);
    window.location.hash = navigation.find((n) => n.name === next)!.key;
    setMobileNav(false);
    setError("");
  }
  async function act(input: Action) {
    if (lock.current) return null;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to complete this action.");
      setState(data.state);
      if (["publish", "archive", "reset"].includes(input.action))
        setResult(null);
      return data as {
        state: Workspace;
        result?: SearchResult;
        articleId?: string;
      };
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to complete this action.",
      );
      return null;
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  async function search(value: string) {
    if (!value.trim()) return;
    setQuestion(value);
    const data = await act({ action: "query", question: value });
    if (data?.result) setResult(data.result);
  }
  async function transition(
    action: "submit" | "publish" | "reject" | "archive" | "revise",
    id: string,
  ) {
    const data = await act({ action, id });
    if (data) {
      notify(
        {
          submit: "Policy sent for review",
          publish: "Policy published and searchable",
          reject: "Policy returned to draft",
          archive: "Policy archived and removed from search",
          revise: "Draft revision created; the published version stays live",
        }[action],
      );
      if (action === "revise") {
        setSelectedId(null);
        setEditing(data.state.articles.find((a) => a.id === data.articleId)!);
      }
    }
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      notify("Copied to clipboard");
    } catch {
      notify("Clipboard unavailable. Select and copy the policy text.");
    }
  }
  function exportWorkspace() {
    const blob = new Blob(
      [
        JSON.stringify(
          { exportedAt: new Date().toISOString(), mode: "showcase", ...state },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "easykms-workspace.json";
    link.click();
    URL.revokeObjectURL(url);
    notify("Workspace exported");
  }
  const selected = state?.articles.find((a) => a.id === selectedId);
  const published =
    state?.articles.filter((a) => a.status === "Published") || [];
  const reviews = state?.articles.filter((a) => a.status === "In review") || [];
  const gaps = state?.gaps.filter((g) => g.status === "Open") || [];
  const library =
    state?.articles.filter(
      (a) =>
        (a.title + " " + a.summary)
          .toLowerCase()
          .includes(filter.toLowerCase()) &&
        (category === "All collections" || a.category === category) &&
        (status === "All statuses" || a.status === status),
    ) || [];
  const searches = state?.searches || [];
  const answered = searches.filter((s) => s.articleIds.length > 0).length;
  const rated = searches.filter((s) => s.feedback).length;
  const helpful = searches.filter((s) => s.feedback === "helpful").length;
  const stale = published.filter(
    (a) => a.reviewDate < new Date().toISOString().slice(0, 10),
  ).length;
  const selectedFeedback = searches.find((s) => s.id === result?.id)?.feedback;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {mobileNav && (
        <button
          className="nav-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <a
          className="brand"
          href="#assist"
          onClick={() => navigate("Agent assist")}
        >
          <span className="brand-symbol">
            <Layers3 size={23} strokeWidth={2} />
          </span>
          <span>
            easy<span className="brand-light">kms</span>
            <span className="brand-dot">.</span>
          </span>
        </a>
        <button className="team-switch" onClick={() => navigate("Workspace")}>
          <span className="team-avatar">N</span>
          <span>
            <strong>{state?.profile?.name || "Northstar Support"}</strong>
            <small>Demo workspace</small>
          </span>
          <ChevronDown size={14} />
        </button>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Main navigation">
          {navigation.slice(0, 5).map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-item ${view === name ? "active" : ""}`}
              onClick={() => navigate(name)}
              aria-current={view === name ? "page" : undefined}
            >
              <Icon size={18} />
              <span>{name}</span>
              {name === "Review queue" && reviews.length > 0 && (
                <span className="nav-count">{reviews.length}</span>
              )}
              {name === "Knowledge gaps" && gaps.length > 0 && (
                <span className="nav-count neutral">{gaps.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-card">
            <div className="demo-label">
              <span className="live-dot" />
              YOUR SANDBOX
            </div>
            <h3>Take the full tour.</h3>
            <p>
              Ask, improve, publish.
              <br />
              See the knowledge loop in action.
            </p>
            <button onClick={() => setGuide(true)}>
              Explore the demo <ArrowUpRight size={15} />
            </button>
          </div>
          <button
            className={`nav-item ${view === "Workspace" ? "active" : ""}`}
            onClick={() => navigate("Workspace")}
          >
            <Settings2 size={18} />
            Workspace settings
          </button>
          <button className="profile" onClick={() => setGuide(true)}>
            <span className="avatar">DM</span>
            <span>
              <strong>Demo member</strong>
              <small>Agent + knowledge manager</small>
            </span>
            <CircleHelp size={17} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-toggle"
              aria-label="Open navigation"
              onClick={() => setMobileNav(true)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{view}</strong>
          </div>
          <div className="top-actions">
            <span className="demo-pill">
              <span className="live-dot" />
              Interactive demo
            </span>
            <button
              className="icon-button"
              aria-label="Demo guide"
              onClick={() => setGuide(true)}
            >
              <CircleHelp size={19} />
            </button>
            <span className="avatar small">DM</span>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {error && !editing && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button onClick={() => void load()}>Reload workspace</button>
              <button
                className="icon-button"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {!state ? (
            <div className="loading">
              <span className="brand-symbol">
                <Layers3 />
              </span>
              <h2>
                {error
                  ? "Your workspace could not load"
                  : "Preparing your workspace…"}
              </h2>
              <p>
                {error
                  ? "Use Reload workspace above to try again."
                  : "A little clarity is on its way."}
              </p>
            </div>
          ) : (
            <>
              {view === "Agent assist" && (
                <>
                  <div className="page-intro">
                    <div className="eyebrow">
                      <span className="live-dot" />
                      THE ANSWER STARTS HERE
                    </div>
                    <h1>
                      Good answers.
                      <br className="mobile-break" />{" "}
                      <em>Great conversations.</em>
                    </h1>
                    <p>Your team’s approved knowledge, one question away.</p>
                  </div>
                  <div className="assist-grid">
                    <section className="assist-main">
                      <form
                        className="ask-card"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void search(question);
                        }}
                      >
                        <div className="ask-label">
                          <span className="sparkle-box">
                            <Sparkles size={18} />
                          </span>
                          <span>What can we help you resolve?</span>
                          <kbd>⌘ K</kbd>
                        </div>
                        <textarea
                          ref={queryRef}
                          aria-label="Ask a support question"
                          value={question}
                          onChange={(e) => setQuestion(e.target.value)}
                          maxLength={600}
                          placeholder="Ask a question about a policy, process, or customer issue…"
                          rows={3}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              if (!busy) void search(question);
                            }
                          }}
                        />
                        <div className="ask-footer">
                          <span>
                            <ShieldCheck size={14} />
                            Only approved, current policies
                          </span>
                          <button
                            className="button primary"
                            disabled={busy || !question.trim()}
                          >
                            {busy ? "Searching…" : "Find an answer"}
                            <ArrowRight size={16} />
                          </button>
                        </div>
                      </form>
                      <div className="suggestions">
                        <span>TRY ASKING</span>
                        {suggestions.map((s) => (
                          <button
                            key={s}
                            onClick={() => void search(s)}
                            disabled={busy}
                          >
                            {s}
                            <ArrowUpRight size={12} />
                          </button>
                        ))}
                      </div>
                      {result && (
                        <section className="result-panel" aria-live="polite">
                          <div className="section-heading">
                            <h2>
                              {result.sources.length
                                ? "Here’s what the policies say"
                                : "Let’s close this knowledge gap"}
                            </h2>
                            <button
                              className="icon-button"
                              onClick={() => setResult(null)}
                              aria-label="Dismiss search results"
                            >
                              <X size={18} />
                            </button>
                          </div>
                          <p className="result-question">“{result.question}”</p>
                          {result.sources.length ? (
                            <>
                              <div className="result-meta">
                                <ShieldCheck size={14} />
                                Direct policy excerpts<span>•</span>
                                {result.durationMs} ms retrieval
                              </div>
                              {result.sources.map((a, i) => (
                                <article className="source-answer" key={a.id}>
                                  <button
                                    className="source-title"
                                    onClick={() => setSelectedId(a.id)}
                                  >
                                    <span className="source-number">
                                      {i + 1}
                                    </span>
                                    <strong>{a.title}</strong>
                                    <span className="muted">v{a.version}</span>
                                    <ArrowUpRight size={15} />
                                  </button>
                                  <div className="policy-content">
                                    {a.content.split("\n\n").map((p, j) => (
                                      <p key={j}>{p}</p>
                                    ))}
                                  </div>
                                </article>
                              ))}
                              <p className="source-disclaimer">
                                Retrieved matches, not a generated answer. Check
                                the policy’s applicability before sharing with a
                                customer.
                              </p>
                              <div className="result-actions">
                                <span>Was this useful?</span>
                                <button
                                  className={`icon-button ${selectedFeedback === "helpful" ? "chosen" : ""}`}
                                  aria-label="Helpful"
                                  aria-pressed={selectedFeedback === "helpful"}
                                  disabled={busy}
                                  onClick={() =>
                                    void act({
                                      action: "feedback",
                                      id: result.id,
                                      value: "helpful",
                                    })
                                  }
                                >
                                  <ThumbsUp size={16} />
                                </button>
                                <button
                                  className={`icon-button ${selectedFeedback === "unhelpful" ? "chosen" : ""}`}
                                  aria-label="Not helpful"
                                  aria-pressed={
                                    selectedFeedback === "unhelpful"
                                  }
                                  disabled={busy}
                                  onClick={() =>
                                    void act({
                                      action: "feedback",
                                      id: result.id,
                                      value: "unhelpful",
                                    })
                                  }
                                >
                                  <ThumbsDown size={16} />
                                </button>
                                <button
                                  className="text-button push-right"
                                  onClick={() =>
                                    void copy(
                                      result.sources
                                        .map(
                                          (a) =>
                                            `${a.title} (v${a.version})\n${a.content}`,
                                        )
                                        .join("\n\n"),
                                    )
                                  }
                                >
                                  <Copy size={14} />
                                  Copy excerpts
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <p>
                                We couldn’t find a sufficiently matching,
                                current policy. This question has been added to
                                your knowledge gaps for review.
                              </p>
                              <button
                                className="button secondary"
                                onClick={() => navigate("Knowledge gaps")}
                              >
                                View knowledge gaps
                                <ArrowRight size={16} />
                              </button>
                            </>
                          )}
                        </section>
                      )}
                      <div className="section-heading space-top">
                        <div>
                          <h2>Browse your knowledge</h2>
                          <p>A place for every answer.</p>
                        </div>
                        <button
                          className="text-button"
                          onClick={() => navigate("Knowledge library")}
                        >
                          View library
                          <ArrowRight size={15} />
                        </button>
                      </div>
                      <div className="collection-grid">
                        {categories.map((c, i) => {
                          const Icon = [
                            FileText,
                            ShieldCheck,
                            FolderOpen,
                            Layers3,
                          ][i];
                          return (
                            <button
                              className={`collection-card collection-${i}`}
                              key={c}
                              onClick={() => {
                                setCategory(c);
                                setStatus("Published");
                                navigate("Knowledge library");
                              }}
                            >
                              <span className="collection-icon">
                                <Icon size={20} />
                              </span>
                              <strong>{c}</strong>
                              <span>
                                {
                                  published.filter((a) => a.category === c)
                                    .length
                                }{" "}
                                published policies
                                <ArrowUpRight size={14} />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="section-heading space-top">
                        <h2>Recently updated</h2>
                        <span className="muted tiny">
                          Published & ready to use
                        </span>
                      </div>
                      <div className="recent-list">
                        {[...published]
                          .sort((a, b) =>
                            b.updatedAt.localeCompare(a.updatedAt),
                          )
                          .slice(0, 3)
                          .map((a) => (
                            <button
                              className="recent-row"
                              key={a.id}
                              onClick={() => setSelectedId(a.id)}
                            >
                              <span className="document-icon">
                                <FileText size={19} />
                              </span>
                              <span className="recent-title">
                                <strong>{a.title}</strong>
                                <small>
                                  {a.category} <span>·</span> Version{" "}
                                  {a.version}
                                </small>
                              </span>
                              <span className="row-date">
                                {date(a.updatedAt)}
                              </span>
                              <ChevronRight size={16} />
                            </button>
                          ))}
                      </div>
                    </section>
                    <aside className="assist-aside">
                      <div className="spotlight">
                        <div className="spotlight-label">
                          <span />
                          KNOWLEDGE, CONNECTED
                        </div>
                        <div className="knowledge-art" aria-hidden="true">
                          <div className="orbit orbit-one" />
                          <div className="orbit orbit-two" />
                          <div className="floating-note note-one">
                            <Check size={13} />
                            Reviewed
                          </div>
                          <div className="art-center">
                            <Layers3 size={38} strokeWidth={1.3} />
                          </div>
                          <div className="floating-note note-two">
                            <FileText size={13} />
                            Source included
                          </div>
                          <span className="art-dot d1" />
                          <span className="art-dot d2" />
                        </div>
                        <h2>
                          Confidence comes
                          <br />
                          from the source.
                        </h2>
                        <p>
                          Give every conversation a solid foundation. Verified
                          policies. Clear next steps.
                        </p>
                        <button
                          onClick={() => {
                            setCategory("All collections");
                            setStatus("Published");
                            navigate("Knowledge library");
                          }}
                        >
                          Explore approved knowledge
                          <ArrowUpRight size={15} />
                        </button>
                      </div>
                      <div className="workspace-pulse">
                        <div className="section-heading">
                          <h3>Workspace pulse</h3>
                          <span className="live-dot" />
                        </div>
                        <button
                          onClick={() => {
                            setStatus("Published");
                            setCategory("All collections");
                            navigate("Knowledge library");
                          }}
                        >
                          <span>
                            <BookOpen size={16} />
                            Published policies
                          </span>
                          <strong>{published.length}</strong>
                        </button>
                        <button onClick={() => navigate("Review queue")}>
                          <span>
                            <GitPullRequest size={16} />
                            Awaiting review
                          </span>
                          <strong className="amber-text">
                            {reviews.length}
                          </strong>
                        </button>
                        <button onClick={() => navigate("Knowledge gaps")}>
                          <span>
                            <Lightbulb size={16} />
                            Open knowledge gaps
                          </span>
                          <strong>{gaps.length}</strong>
                        </button>
                      </div>
                      <div className="tip">
                        <span>
                          <Lightbulb size={17} />A BETTER ANSWER, TOGETHER
                        </span>
                        <p>
                          Can’t find what you need? Every unanswered question
                          helps your team improve the library.
                        </p>
                        <button
                          className="text-button"
                          onClick={() => navigate("Knowledge gaps")}
                        >
                          Close the loop
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </aside>
                  </div>
                </>
              )}
              {view === "Knowledge library" && (
                <>
                  <PageHeading
                    eyebrow="YOUR TEAM’S SOURCE OF TRUTH"
                    title="Knowledge library"
                    description="Keep useful knowledge organized, reviewed, and ready for every conversation."
                    action={
                      <button
                        className="button primary"
                        onClick={() => {
                          setError("");
                          setEditing("new");
                        }}
                      >
                        <Plus size={16} />
                        Create policy
                      </button>
                    }
                  />
                  <div className="stat-strip">
                    <Metric
                      label="Total policies"
                      value={state.articles.length}
                    />
                    <Metric label="Published" value={published.length} />
                    <Metric label="Awaiting review" value={reviews.length} />
                    <Metric label="Overdue for review" value={stale} />
                  </div>
                  <div className="library-toolbar">
                    <label className="search-field">
                      <Search size={17} />
                      <input
                        aria-label="Search library"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        placeholder="Search policies…"
                      />
                    </label>
                    <select
                      aria-label="Filter collection"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option>All collections</option>
                      {categories.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                    <select
                      aria-label="Filter status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      {[
                        "All statuses",
                        "Published",
                        "Draft",
                        "In review",
                        "Archived",
                      ].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>POLICY</th>
                          <th>STATUS</th>
                          <th>OWNER</th>
                          <th>UPDATED</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {library.map((a) => (
                          <tr key={a.id}>
                            <td>
                              <button
                                className="table-title"
                                onClick={() => setSelectedId(a.id)}
                              >
                                <span className="document-icon">
                                  <FileText size={19} />
                                </span>
                                <span>
                                  <strong>{a.title}</strong>
                                  <small>
                                    {a.category} · v{a.version}
                                    {a.reviewDate <
                                    new Date().toISOString().slice(0, 10)
                                      ? " · Review overdue"
                                      : ""}
                                  </small>
                                </span>
                              </button>
                            </td>
                            <td>
                              <Badge status={a.status} />
                            </td>
                            <td>
                              <span className="owner-name">{a.owner}</span>
                            </td>
                            <td className="muted">{date(a.updatedAt)}</td>
                            <td>
                              <button
                                className="icon-button"
                                aria-label={`Open ${a.title}`}
                                onClick={() => setSelectedId(a.id)}
                              >
                                <ArrowUpRight size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!library.length && (
                      <Empty title="No policies found">
                        Try a different search or create your first policy.
                      </Empty>
                    )}
                  </div>
                  <p className="muted tiny table-foot">
                    {library.length} policies · Drafts and archived policies are
                    excluded from agent search.
                  </p>
                </>
              )}
              {view === "Review queue" && (
                <>
                  <PageHeading
                    eyebrow="QUALITY BEFORE QUANTITY"
                    title="A second look. A better answer."
                    description="Review policies before they become the answers your team relies on."
                  />
                  <div className="notice">
                    <ShieldCheck size={20} />
                    <div>
                      <strong>Publish with intention</strong>
                      <p>
                        Check eligibility, timelines, and escalation rules.
                        Publishing makes a policy immediately searchable. You
                        can try both editor and reviewer actions in this demo.
                      </p>
                    </div>
                  </div>
                  <div className="section-heading space-top">
                    <h2>
                      Awaiting review{" "}
                      <span className="inline-count">{reviews.length}</span>
                    </h2>
                  </div>
                  {reviews.length ? (
                    <div className="review-grid">
                      {reviews.map((a) => (
                        <article className="review-card" key={a.id}>
                          <div className="section-heading">
                            <Badge status={a.status} />
                            <span className="muted tiny">
                              Version {a.version}
                            </span>
                          </div>
                          <h3>{a.title}</h3>
                          <p>{a.summary}</p>
                          <div className="review-by">
                            <span className="avatar small">
                              {a.owner
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </span>
                            <span>
                              {a.owner}
                              <small>Submitted {date(a.updatedAt)}</small>
                            </span>
                          </div>
                          <div className="review-preview">
                            {a.content.slice(0, 210)}
                            {a.content.length > 210 ? "…" : ""}
                          </div>
                          <button
                            className="button secondary full"
                            onClick={() => setSelectedId(a.id)}
                          >
                            Read & review policy
                            <ArrowRight size={16} />
                          </button>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <Empty icon={CheckCheck} title="You’re all caught up">
                      New policies will appear here once an editor submits them
                      for review.
                    </Empty>
                  )}
                  <ActivityList state={state} />
                </>
              )}
              {view === "Knowledge gaps" && (
                <>
                  <PageHeading
                    eyebrow="TURN QUESTIONS INTO KNOWLEDGE"
                    title="Every gap is an opportunity."
                    description="See what your agents need, create the missing guidance, and close the loop."
                    action={
                      <span className="badge status-in-review">
                        {gaps.length} open gaps
                      </span>
                    }
                  />
                  <div className="notice">
                    <Lightbulb size={20} />
                    <div>
                      <strong>Listen to what’s missing</strong>
                      <p>
                        Unanswered searches are captured automatically. Create
                        and publish a policy, then link it to resolve a gap.
                        Initial examples are fictional demo data.
                      </p>
                    </div>
                  </div>
                  <div className="gap-list">
                    {state.gaps.map((g) => (
                      <article
                        className={`gap-card ${g.status === "Resolved" ? "resolved" : ""}`}
                        key={g.id}
                      >
                        <span className="gap-icon">
                          {g.status === "Resolved" ? (
                            <Check size={20} />
                          ) : (
                            <MessageSquareText size={20} />
                          )}
                        </span>
                        <div className="gap-body">
                          <div className="gap-meta">
                            <span>
                              {g.status === "Resolved"
                                ? "RESOLVED"
                                : "NEEDS KNOWLEDGE"}
                            </span>
                            <span>
                              {g.count} {g.count === 1 ? "request" : "requests"}{" "}
                              · {date(g.createdAt)}
                            </span>
                          </div>
                          <h3>{g.question}</h3>
                          {g.articleId && (
                            <button
                              className="text-button"
                              onClick={() => setSelectedId(g.articleId!)}
                            >
                              View linked policy
                              <ArrowUpRight size={14} />
                            </button>
                          )}
                        </div>
                        {g.status === "Open" && (
                          <div className="gap-actions">
                            <button
                              className="button secondary"
                              onClick={() => {
                                setError("");
                                setEditing("new");
                              }}
                            >
                              Create policy
                              <Plus size={14} />
                            </button>
                            <button
                              className="text-button"
                              onClick={() => setResolveGap(g.id)}
                            >
                              Link & resolve
                              <ArrowRight size={14} />
                            </button>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                  {!state.gaps.length && (
                    <Empty icon={Lightbulb} title="No knowledge gaps yet">
                      Questions without matching policies will appear here.
                    </Empty>
                  )}
                </>
              )}
              {view === "Insights" && (
                <>
                  <PageHeading
                    eyebrow="MEASURE WHAT HELPS"
                    title="A clearer picture of your knowledge."
                    description="Real activity from your demo workspace. No invented savings or success metrics."
                    action={
                      <button
                        className="button secondary"
                        onClick={exportWorkspace}
                      >
                        <ArrowDownToLine size={16} />
                        Export data
                      </button>
                    }
                  />
                  <div className="stat-strip four">
                    <Metric label="Questions asked" value={searches.length} />
                    <Metric
                      label="Searches with matches"
                      value={
                        searches.length
                          ? Math.round((answered / searches.length) * 100) + "%"
                          : "—"
                      }
                    />
                    <Metric
                      label="Positive feedback"
                      value={
                        rated ? Math.round((helpful / rated) * 100) + "%" : "—"
                      }
                    />
                    <Metric
                      label="Knowledge gaps resolved"
                      value={
                        state.gaps.filter((g) => g.status === "Resolved").length
                      }
                    />
                  </div>
                  <div className="insight-grid">
                    <section className="panel">
                      <div className="section-heading">
                        <h2>Questions over time</h2>
                        <span className="muted tiny">Last 7 days · UTC</span>
                      </div>
                      <div
                        className="bar-chart"
                        role="img"
                        aria-label="Questions asked per day over the past seven days"
                      >
                        {Array.from({ length: 7 }, (_, index) => {
                          const day = new Date(todayMs - (6 - index) * 86400000)
                            .toISOString()
                            .slice(0, 10);
                          const count = searches.filter((s) =>
                            s.createdAt.startsWith(day),
                          ).length;
                          const max = Math.max(
                            1,
                            ...Array.from(
                              { length: 7 },
                              (_, i) =>
                                searches.filter((s) =>
                                  s.createdAt.startsWith(
                                    new Date(todayMs - i * 86400000)
                                      .toISOString()
                                      .slice(0, 10),
                                  ),
                                ).length,
                            ),
                          );
                          return (
                            <div className="bar-column" key={day}>
                              <span>{count}</span>
                              <div className="bar-track">
                                <div
                                  className="bar"
                                  style={{ height: `${(count / max) * 100}%` }}
                                />
                              </div>
                              <small>
                                {new Date(
                                  day + "T12:00:00Z",
                                ).toLocaleDateString("en", {
                                  weekday: "short",
                                  timeZone: "UTC",
                                })}
                              </small>
                            </div>
                          );
                        })}
                      </div>
                      <p className="muted tiny">
                        Counts update as you use Agent assist. Retains your most
                        recent 1,000 searches.
                      </p>
                    </section>
                    <section className="panel">
                      <h2>Knowledge health</h2>
                      <div className="health-row">
                        <span>Current published policies</span>
                        <strong>{published.length - stale}</strong>
                      </div>
                      <div className="health-row">
                        <span>Overdue review dates</span>
                        <strong>{stale}</strong>
                      </div>
                      <div className="health-row">
                        <span>Awaiting approval</span>
                        <strong>{reviews.length}</strong>
                      </div>
                      <div className="health-row">
                        <span>Feedback received</span>
                        <strong>{rated}</strong>
                      </div>
                      <p className="muted tiny">
                        A search match indicates retrieved content, not verified
                        answer correctness.
                      </p>
                    </section>
                  </div>
                  <div className="section-heading space-top">
                    <h2>Recent questions</h2>
                  </div>
                  {searches.length ? (
                    <div className="recent-list">
                      {searches.slice(0, 10).map((s) => (
                        <div className="recent-row" key={s.id}>
                          <MessageSquareText size={18} />
                          <span className="recent-title">
                            <strong>{s.question}</strong>
                            <small>
                              {date(s.createdAt)} ·{" "}
                              {s.feedback
                                ? s.feedback === "helpful"
                                  ? "Helpful"
                                  : "Not helpful"
                                : "No feedback yet"}
                            </small>
                          </span>
                          <span
                            className={`badge ${s.articleIds.length ? "status-published" : "status-in-review"}`}
                          >
                            {s.articleIds.length
                              ? `${s.articleIds.length} sources`
                              : "Knowledge gap"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Empty title="Your story starts with a question">
                      Use Agent assist to see search and feedback activity here.
                    </Empty>
                  )}
                </>
              )}
              {view === "Workspace" && (
                <>
                  <PageHeading
                    eyebrow="BUILT TO BE EXPLORED"
                    title="Your workspace, at a glance."
                    description="An independent sandbox for exploring the full support knowledge workflow."
                  />
                  <div className="settings-grid">
                    <section className="panel">
                      <span className="team-avatar large">N</span>
                      <h2>{state?.profile?.name || "Northstar Support"}</h2>
                      <p className="muted">
                        Fictional customer-care team · Portfolio showcase
                      </p>
                      <div className="health-row">
                        <span>Mode</span>
                        <strong>Interactive demo</strong>
                      </div>
                      <div className="health-row">
                        <span>Answer engine</span>
                        <strong>Full-text retrieval</strong>
                      </div>
                      <div className="health-row">
                        <span>Access</span>
                        <strong>Editor + reviewer</strong>
                      </div>
                      <div className="health-row">
                        <span>Data retention</span>
                        <strong>7 days from first visit</strong>
                      </div>
                      <p className="muted tiny">
                        Your browser cookie identifies this sandbox. It is not
                        an enterprise login. Use fictional content only.
                      </p>
                    </section>
                    <section className="panel">
                      <h2>Make it yours</h2>
                      <a className="button secondary" href="/setup">
                        Configure workspace & import policies →
                      </a>
                      <p className="muted">
                        Create policies, test search, and explore governance.
                        Changes persist across refreshes in this browser.
                      </p>
                      <button
                        className="settings-action"
                        onClick={() => setGuide(true)}
                      >
                        <span>
                          <CircleHelp size={18} />
                          Walk through the demo
                        </span>
                        <ArrowUpRight size={16} />
                      </button>
                      <button
                        className="settings-action"
                        onClick={exportWorkspace}
                      >
                        <span>
                          <ArrowDownToLine size={18} />
                          Export workspace as JSON
                        </span>
                        <ArrowRight size={16} />
                      </button>
                      <button
                        className="settings-action danger"
                        onClick={() => setReset(true)}
                      >
                        <span>
                          <Clock3 size={18} />
                          Reset to sample data
                        </span>
                        <ArrowRight size={16} />
                      </button>
                      <div className="production-note">
                        <ShieldCheck size={19} />
                        <p>
                          <strong>A deliberate path to production</strong>
                          <br />
                          Enterprise sign-in, enforced team roles, Drive
                          ingestion, and hybrid AI retrieval are next-stage
                          integrations. They are not enabled in this demo.
                        </p>
                      </div>
                    </section>
                  </div>
                  <ActivityList state={state} />
                </>
              )}
              <footer className="footer">
                <span>
                  <Layers3 size={13} />
                  EasyKMS · Clarity for every conversation.
                </span>
                <button onClick={() => setGuide(true)}>
                  About this demo
                  <ArrowUpRight size={12} />
                </button>
              </footer>
            </>
          )}
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
      {editing && (
        <Editor
          article={editing === "new" ? undefined : editing}
          busy={busy}
          error={error}
          onClose={() => {
            setEditing(null);
            setError("");
          }}
          onSave={async (values) => {
            const data = await act(
              editing === "new"
                ? { action: "create", article: values }
                : { action: "update", id: editing.id, article: values },
            );
            if (data) {
              const id = editing === "new" ? data.articleId : editing.id;
              setEditing(null);
              setSelectedId(id || null);
              notify("Draft saved");
            }
          }}
        />
      )}
      {selected && !editing && (
        <Dialog title="Policy details" onClose={() => setSelectedId(null)} wide>
          <div className="article-detail">
            <div className="section-heading">
              <Badge status={selected.status} />
              <span className="muted tiny">
                Version {selected.version} · {selected.category}
              </span>
            </div>
            <h2>{selected.title}</h2>
            <p className="article-summary">{selected.summary}</p>
            <div className="article-meta">
              <span>Owner: {selected.owner}</span>
              <span>Updated {date(selected.updatedAt)}</span>
              <span>Review by {date(selected.reviewDate)}</span>
            </div>
            <div className="policy-content">
              {selected.content.split("\n\n").map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            {error && (
              <p role="alert" className="inline-error">
                {error}
              </p>
            )}
            <div className="dialog-actions wrap">
              <button
                className="text-button"
                onClick={() =>
                  void copy(
                    `${selected.title} (v${selected.version})\n${selected.content}`,
                  )
                }
              >
                <Copy size={15} />
                Copy policy
              </button>
              <span className="push-right" />
              {selected.status === "Draft" && (
                <>
                  <button
                    className="button secondary"
                    onClick={() => setEditing(selected)}
                  >
                    Edit draft
                  </button>
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={() => void transition("submit", selected.id)}
                  >
                    Submit for review
                    <ArrowRight size={15} />
                  </button>
                </>
              )}
              {selected.status === "In review" && (
                <>
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => void transition("reject", selected.id)}
                  >
                    Request changes
                  </button>
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={() => void transition("publish", selected.id)}
                  >
                    Approve & publish
                    <Check size={15} />
                  </button>
                </>
              )}
              {selected.status === "Published" && (
                <>
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => void transition("archive", selected.id)}
                  >
                    Archive
                  </button>
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={() => void transition("revise", selected.id)}
                  >
                    Create revision
                    <Plus size={15} />
                  </button>
                </>
              )}
            </div>
          </div>
        </Dialog>
      )}
      {resolveGap && (
        <Dialog
          title="Link a policy & resolve"
          onClose={() => setResolveGap(null)}
        >
          <form
            className="editor"
            onSubmit={async (e) => {
              e.preventDefault();
              const articleId = String(
                new FormData(e.currentTarget).get("articleId"),
              );
              const data = await act({
                action: "resolve",
                id: resolveGap,
                articleId,
              });
              if (data) {
                setResolveGap(null);
                notify("Knowledge gap resolved");
              }
            }}
          >
            <p className="muted">
              Choose the published policy that answers this question. Review its
              content before marking the gap resolved.
            </p>
            <label>
              Published policy
              <select name="articleId" required>
                <option value="">Select a policy…</option>
                {published
                  .filter(
                    (a) =>
                      a.reviewDate >= new Date().toISOString().slice(0, 10),
                  )
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title}
                    </option>
                  ))}
              </select>
            </label>
            {error && (
              <p role="alert" className="inline-error">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setResolveGap(null)}
              >
                Cancel
              </button>
              <button className="button primary" disabled={busy}>
                Resolve gap
                <Check size={16} />
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {reset && (
        <Dialog title="Start fresh?" onClose={() => setReset(false)}>
          <div className="editor">
            <p>
              This replaces your demo policies, searches, feedback, and activity
              with the original sample data. Other visitors’ workspaces are
              unaffected.
            </p>
            <div className="dialog-actions">
              <button
                className="button secondary"
                onClick={() => setReset(false)}
              >
                Keep my workspace
              </button>
              <button
                className="button danger-fill"
                disabled={busy}
                onClick={async () => {
                  const data = await act({ action: "reset" });
                  if (data) {
                    setReset(false);
                    setResult(null);
                    notify("Workspace reset to sample data");
                  }
                }}
              >
                Reset workspace
              </button>
            </div>
          </div>
        </Dialog>
      )}
      {guide && (
        <Dialog
          title="Meet your knowledge workspace"
          onClose={() => setGuide(false)}
        >
          <div className="guide-body">
            <p className="muted">
              EasyKMS helps customer-support teams find trustworthy guidance and
              improve it together. Here’s a two-minute tour.
            </p>
            {[
              [
                "01",
                "Find an approved answer",
                "Ask “What is our refund policy?” in Agent assist. Open the cited source and leave feedback.",
              ],
              [
                "02",
                "Discover a knowledge gap",
                "Ask about accidental water damage. A missing answer becomes a trackable gap.",
              ],
              [
                "03",
                "Build the missing knowledge",
                "Create a warranty policy, save it as a draft, and submit it for review.",
              ],
              [
                "04",
                "Publish. Search. Close the loop.",
                "Approve the policy in Review queue, ask again, and link the policy to resolve the gap.",
              ],
            ].map(([n, t, d]) => (
              <div className="guide-step" key={n}>
                <span>{n}</span>
                <div>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </div>
              </div>
            ))}
            <div className="notice">
              <ShieldCheck size={22} />
              <p>
                This is a working sandbox with fictional policies and persistent
                storage. Answers are retrieved excerpts, not AI-generated
                advice. Both editor and reviewer actions are available for the
                tour.
              </p>
            </div>
            <button
              className="button primary full"
              onClick={() => {
                setGuide(false);
                navigate("Agent assist");
              }}
            >
              Let’s explore
              <ArrowRight size={16} />
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function ActivityList({ state }: { state: Workspace }) {
  return (
    <section className="activity-section">
      <div className="section-heading space-top">
        <h2>Recent activity</h2>
        <span className="muted tiny">Governance trail</span>
      </div>
      <div className="recent-list">
        {state.activity.slice(0, 8).map((a) => (
          <div className="recent-row" key={a.id}>
            <span className="activity-dot" />
            <span className="recent-title">
              <strong>{a.action}</strong>
              <small>{a.detail}</small>
            </span>
            <span className="muted tiny">{date(a.createdAt)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
