import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  GitPullRequest,
  Lightbulb,
  ShieldCheck,
} from "lucide-react";
import PublicShell from "@/components/public-shell";
export default function Home() {
  return (
    <PublicShell>
      <main className="public-main">
        <section className="landing-hero">
          <div>
            <p className="eyebrow">KNOWLEDGE THAT SUPPORTS YOUR SUPPORT TEAM</p>
            <h1>
              Every great conversation
              <br />
              starts with <em>a clear answer.</em>
            </h1>
            <p className="hero-description">
              Bring approved policies, thoughtful reviews, and unanswered
              questions into one calm workspace. Help your agents find guidance
              they can trace back to the source.
            </p>
            <div className="hero-actions">
              <Link href="/demo" className="button primary">
                Explore the working demo
                <ArrowRight size={17} />
              </Link>
              <Link href="/walkthrough" className="button secondary">
                Take the two-minute tour
              </Link>
            </div>
            <p className="muted tiny">
              No signup. No API keys. Your own fictional support workspace.
            </p>
          </div>
          <div className="landing-proof">
            <span className="badge status-published">
              <ShieldCheck size={14} />
              Published policy · v3
            </span>
            <h2>“Can this customer get a refund?”</h2>
            <p>
              Customers can return unused products within 30 days of delivery.
            </p>
            <div className="proof-source">
              <BookOpen size={18} />
              <span>
                Refunds & return eligibility
                <small>Source visible. Context preserved.</small>
              </span>
            </div>
            <div className="proof-loop">
              <span>Question</span>→<span>Source</span>→<span>Resolution</span>
            </div>
          </div>
        </section>
        <section className="value-grid">
          {[
            [
              BookOpen,
              "Find the policy, not a guess",
              "Search current, approved guidance and read the original text.",
            ],
            [
              GitPullRequest,
              "Publish with a second pair of eyes",
              "Keep drafts out of search and preserve live versions during review.",
            ],
            [
              Lightbulb,
              "Turn missing answers into better knowledge",
              "Capture unanswered questions and resolve them with published policies.",
            ],
          ].map(([Icon, title, description]) => {
            const I = Icon as typeof BookOpen;
            return (
              <article key={String(title)}>
                <I size={25} />
                <h2>{String(title)}</h2>
                <p>{String(description)}</p>
              </article>
            );
          })}
        </section>
        <section className="landing-band">
          <div>
            <p className="eyebrow">A COMPLETE PRODUCT STORY</p>
            <h2>From an unfinished idea to a working knowledge loop.</h2>
            <p>
              Explore the product decisions, architecture, tests, and honest
              limits behind EasyKMS.
            </p>
          </div>
          <Link href="/case-study" className="button secondary">
            Read the case study
            <ArrowRight size={16} />
          </Link>
        </section>
        <section className="public-disclosure">
          <ShieldCheck size={20} />
          <p>
            <strong>Clear about what’s live.</strong> The public demo uses
            fictional policies and direct excerpts. Team authentication, managed
            Postgres, Drive imports, and optional AI need deployment
            configuration. This is a portfolio release, not a claim of
            enterprise certification.
          </p>
        </section>
      </main>
    </PublicShell>
  );
}
