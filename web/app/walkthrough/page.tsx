import Link from "next/link";
import PublicShell from "@/components/public-shell";
const steps = [
  [
    "Ask a real support question",
    "Open Agent assist and ask “What is our refund policy?” Read the excerpts, open a source, and mark the result helpful.",
    "/demo#assist",
  ],
  [
    "Find the missing guidance",
    "Ask “Does the warranty cover accidental water damage?” The demo has no approved policy for this, so it records a knowledge gap.",
    "/demo#assist",
  ],
  [
    "Write the missing policy",
    "Create a policy titled “Water damage warranty”. Explain that accidental water damage is excluded, with an escalation path to the repair team. Save and submit the draft.",
    "/demo#library",
  ],
  [
    "Review and publish",
    "Open the review queue, inspect the content, and approve it. Drafts stay out of search until this step.",
    "/demo#reviews",
  ],
  [
    "Close the loop",
    "Ask the warranty question again. Link the new policy to the original gap, resolve it, then inspect your real search and feedback activity.",
    "/demo#gaps",
  ],
];
export default function Walkthrough() {
  return (
    <PublicShell>
      <main className="public-main narrow">
        <p className="eyebrow">TWO MINUTES. ONE COMPLETE WORKFLOW.</p>
        <h1>Take the knowledge loop for a spin.</h1>
        <p className="hero-description">
          The demo lets you act as agent, editor, and reviewer. Real team mode
          enforces these roles separately.
        </p>
        <div className="walk-steps">
          {steps.map(([title, body, href], i) => (
            <article key={title}>
              <span className="step-number">0{i + 1}</span>
              <div>
                <h2>{title}</h2>
                <p>{body}</p>
                <Link className="text-button" href={href}>
                  Open this step →
                </Link>
              </div>
            </article>
          ))}
        </div>
        <div className="notice">
          <p>
            The guide is text-based and interactive; no prerecorded video is
            claimed. Your demo data persists for seven days. Export it from
            Workspace before it expires.
          </p>
        </div>
      </main>
    </PublicShell>
  );
}
