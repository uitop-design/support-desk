import Link from "next/link";

export default function Home() {
  return (
    <section className="hero">
      <h1>How can we help?</h1>
      <p>Send us a request and our team will get back to you by email.</p>
      <Link className="btn" href="/support/new">Submit a request</Link>
    </section>
  );
}
