import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ticketListSchema, STATUSES, PRIORITIES } from "@/lib/validation";
import { PriorityBadge, StatusBadge } from "@/components/Badges";
import { getStatusCounts } from "@/lib/counters";

export const dynamic = "force-dynamic";

type Search = Promise<Record<string, string | undefined>>;

const timeFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "short", timeStyle: "short" });

export default async function InboxPage({ searchParams }: { searchParams: Search }) {
  const raw = await searchParams;
  const parsed = ticketListSchema.safeParse(raw);
  const f = parsed.success ? parsed.data : ticketListSchema.parse({});

  const where: Prisma.TicketWhereInput = {
    status: f.status,
    priority: f.priority,
    ...(f.assignee === "unassigned" ? { assigneeId: null } : f.assignee ? { assigneeId: f.assignee } : {}),
    ...(f.q ? { subject: { contains: f.q, mode: "insensitive" } } : {}),
  };

  const [tickets, agents, counts] = await Promise.all([
    prisma.ticket.findMany({
      where,
      include: { assignee: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: f.limit,
      skip: (f.page - 1) * f.limit,
    }),
    prisma.agent.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    getStatusCounts(),
  ]);

  return (
    <>
      <h1>Inbox</h1>
      <div className="counters">
        {STATUSES.map((s) => (
          <Link key={s} href={`/inbox?status=${s}`} className={`counter ${f.status === s ? "active" : ""}`}>
            <strong>{counts[s]}</strong> {s.toLowerCase()}
          </Link>
        ))}
      </div>
      <form className="filters" method="get">
        <input name="q" placeholder="Search subject" defaultValue={f.q ?? ""} />
        <select name="status" defaultValue={f.status ?? ""}>
          <option value="">Any status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.toLowerCase()}</option>)}
        </select>
        <select name="priority" defaultValue={f.priority ?? ""}>
          <option value="">Any priority</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p.toLowerCase()}</option>)}
        </select>
        <select name="assignee" defaultValue={f.assignee ?? ""}>
          <option value="">Anyone</option>
          <option value="unassigned">Unassigned</option>
          {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <button className="btn" type="submit">Filter</button>
      </form>

      <table className="table">
        <thead>
          <tr><th>#</th><th>Subject</th><th>Requester</th><th>Status</th><th>Priority</th><th>Assignee</th><th>Updated</th></tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <tr key={t.id}>
              <td>{t.number}</td>
              <td><Link href={`/tickets/${t.id}`}>{t.subject}</Link></td>
              <td>{t.requesterEmail}</td>
              <td><StatusBadge status={t.status} /></td>
              <td><PriorityBadge priority={t.priority} /></td>
              <td>{t.assignee?.name ?? <span className="muted">-</span>}</td>
              <td className="muted">{timeFmt.format(t.updatedAt)}</td>
            </tr>
          ))}
          {tickets.length === 0 && (
            <tr><td colSpan={7} className="muted">No tickets match these filters.</td></tr>
          )}
        </tbody>
      </table>
    </>
  );
}
