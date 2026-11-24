"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Agent = { id: string; name: string };

const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"];

export function TicketControls(props: {
  ticketId: string;
  status: string;
  nextStatuses: string[];
  priority: string;
  assigneeId: string | null;
  agents: Agent[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function update(patch: Record<string, unknown>) {
    setError(null);
    const res = await fetch(`/api/tickets/${props.ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Update failed");
      return;
    }
    router.refresh();
  }

  return (
    <aside className="panel">
      <label>
        Status
        <select value={props.status} onChange={(e) => update({ status: e.target.value })}>
          {[props.status, ...props.nextStatuses].map((s) => (
            <option key={s} value={s}>{s.toLowerCase()}</option>
          ))}
        </select>
      </label>
      <label>
        Priority
        <select value={props.priority} onChange={(e) => update({ priority: e.target.value })}>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p.toLowerCase()}</option>)}
        </select>
      </label>
      <label>
        Assignee
        <select
          value={props.assigneeId ?? ""}
          onChange={(e) => update({ assigneeId: e.target.value || null })}
        >
          <option value="">Unassigned</option>
          {props.agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </label>
      {error && <p className="error">{error}</p>}
    </aside>
  );
}
