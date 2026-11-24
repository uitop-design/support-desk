import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Support Desk",
  description: "Lightweight helpdesk for small teams",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <Link href="/" className="nav-brand">Support Desk</Link>
          <Link href="/inbox">Inbox</Link>
          <Link href="/support/new">New request</Link>
        </nav>
        <main className="main">{children}</main>
      </body>
    </html>
  );
}
