import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "EasyKMS — Clarity for every conversation",
  description:
    "A source-first knowledge workspace for customer support teams. Explore approved answers, policy reviews, and knowledge gaps in a working demo.",
  robots: { index: true, follow: true },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
