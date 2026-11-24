"use client";

import { useState } from "react";

type Errors = Partial<Record<"subject" | "body" | "requesterName" | "requesterEmail", string[]>>;

export function RequestForm() {
  const [sent, setSent] = useState<number | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form)),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setErrors(data.error?.fieldErrors ?? {});
      return;
    }
    setSent(data.number);
  }

  if (sent) {
    return (
      <div className="panel">
        <h2>Thanks, we got it</h2>
        <p>Your request number is <strong>#{sent}</strong>. We will reply by email.</p>
      </div>
    );
  }

  return (
    <form className="panel request" onSubmit={submit}>
      <label>Your name<input name="requesterName" required /></label>
      {errors.requesterName && <span className="error">{errors.requesterName[0]}</span>}
      <label>Email<input name="requesterEmail" type="email" required /></label>
      {errors.requesterEmail && <span className="error">{errors.requesterEmail[0]}</span>}
      <label>Subject<input name="subject" required minLength={3} /></label>
      {errors.subject && <span className="error">{errors.subject[0]}</span>}
      <label>How can we help?<textarea name="body" rows={6} required /></label>
      {errors.body && <span className="error">{errors.body[0]}</span>}
      <button className="btn" type="submit" disabled={busy}>{busy ? "Sending..." : "Send request"}</button>
    </form>
  );
}
