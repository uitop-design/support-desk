"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ReplyForm({ ticketId, agents }: { ticketId: string; agents: { id: string; name: string }[] }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [agentId, setAgentId] = useState(agents[0]?.id ?? "");
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/tickets/${ticketId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, authorType: "AGENT", agentId, internal }),
    });
    setBusy(false);
    if (res.ok) {
      setBody("");
      router.refresh();
    }
  }

  return (
    <form className={`reply ${internal ? "is-internal" : ""}`} onSubmit={submit}>
      <textarea
        rows={5}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={internal ? "Internal note, only agents will see it" : "Reply to the customer"}
      />
      <div className="reply-bar">
        <select value={agentId} onChange={(e) => setAgentId(e.target.value)} aria-label="Reply as">
          {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <label><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> Internal note</label>
        <button className="btn" type="submit" disabled={busy}>{internal ? "Add note" : "Send reply"}</button>
      </div>
    </form>
  );
}
