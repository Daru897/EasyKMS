import Link from "next/link";
import PublicShell from "@/components/public-shell";
export default function CaseStudy() {
  return (
    <PublicShell>
      <main className="public-main narrow case-study">
        <p className="eyebrow">PRODUCT CASE STUDY · PERSONAL PROJECT</p>
        <h1>Making support knowledge useful—and accountable.</h1>
        <p className="hero-description">
          EasyKMS connects the moment an agent asks a question with the process
          that improves the next answer.
        </p>
        <dl className="case-facts">
          <div>
            <dt>Audience</dt>
            <dd>Support teams & BPOs</dd>
          </div>
          <div>
            <dt>Release</dt>
            <dd>Working portfolio showcase</dd>
          </div>
          <div>
            <dt>Focus</dt>
            <dd>Source visibility & governance</dd>
          </div>
        </dl>
        <section>
          <h2>The problem</h2>
          <p>
            Support guidance often lives across documents, old policies, and
            informal team knowledge. An agent needs an answer now; a knowledge
            manager needs to know what is missing and who approved what.
          </p>
          <p>
            This is the product hypothesis behind the project. No customer
            interviews, adoption figures, or operational savings are claimed.
          </p>
        </section>
        <section>
          <h2>The product decision</h2>
          <p>
            Build a complete knowledge loop: question → approved source →
            feedback → missing knowledge → draft → review → publication.
            Prioritize an inspectable source and a useful abstention over
            unsupported answers.
          </p>
        </section>
        <section>
          <h2>What changed</h2>
          <p>
            The original repository combined a Next.js app with multiple cloud
            dependencies and inconsistent readiness claims. The rebuild created
            a credential-free demo, isolated visitor data, a coherent review
            workflow, a deployable container, and automated tests. The original
            code remains available as reference.
          </p>
        </section>
        <section>
          <h2>Three deliberate tradeoffs</h2>
          <ul>
            <li>
              <strong>Excerpts first:</strong> lexical search is useful and
              inexpensive, but it cannot fully understand ambiguous or
              multilingual questions.
            </li>
            <li>
              <strong>Simple demo storage:</strong> SQLite keeps a self-hosted
              demo easy to run; managed Postgres supports the separate
              authenticated team mode.
            </li>
            <li>
              <strong>Visible boundaries:</strong> optional cloud integrations
              are configured explicitly, and model-generated summaries stay
              separate from policy evidence.
            </li>
          </ul>
        </section>
        <section>
          <h2>How the release is checked</h2>
          <p>
            Automated tests cover the publish-and-retrieve journey, visitor
            isolation, invalid input, policy expiry, revisions, accessibility,
            and persistence across a server restart. Repository validation notes
            distinguish local tests from integrations that still need live
            credentials.
          </p>
        </section>
        <section>
          <h2>The next evidence to collect</h2>
          <p>
            A real pilot should measure expert-rated retrieval relevance, time
            to a verified answer, review turnaround, and recurring gaps.
            Baselines should come before claims about productivity or cost
            reduction.
          </p>
        </section>
        <div className="hero-actions">
          <Link className="button primary" href="/demo">
            Try EasyKMS →
          </Link>
          <a
            className="button secondary"
            href="https://github.com/Daru897/EasyKMS"
          >
            Explore the repository
          </a>
        </div>
      </main>
    </PublicShell>
  );
}
