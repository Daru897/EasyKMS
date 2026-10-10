import Link from "next/link";
import { Layers3, ArrowUpRight } from "lucide-react";
export default function PublicShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="public-site">
      <header className="public-nav">
        <Link href="/" className="brand">
          <span className="brand-symbol">
            <Layers3 size={23} />
          </span>
          easykms.
        </Link>
        <nav aria-label="Public navigation">
          <Link href="/case-study">Case study</Link>
          <Link href="/walkthrough">Walkthrough</Link>
          <Link href="/team">Team sign-in</Link>
          <Link href="/demo" className="button primary">
            Try the demo
            <ArrowUpRight size={16} />
          </Link>
        </nav>
      </header>
      {children}
      <footer className="public-footer">
        <span>EasyKMS · Clarity for every conversation.</span>
        <Link href="/setup">Set up your workspace →</Link>
        <a href="https://github.com/Daru897/EasyKMS">View source</a>
      </footer>
    </div>
  );
}
