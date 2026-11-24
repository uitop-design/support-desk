import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { allowedNext } from "@/lib/workflow";
import { PriorityBadge, StatusBadge } from "@/components/Badges";
import { TicketControls } from "@/components/TicketControls";
import { ReplyForm } from "@/components/ReplyForm";

export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [ticket, agents] = await Promise.all([
    prisma.ticket.findUnique({
      where: { id },
      include: { comments: { orderBy: { createdAt: "asc" }, include: { agent: { select: { name: true } } } } },
    }),
    prisma.agent.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!ticket) notFound();

  return (
    <div className="ticket-layout">
      <section>
        <h1>#{ticket.number} {ticket.subject}</h1>
        <p className="muted">
          <StatusBadge status={ticket.status} /> <PriorityBadge priority={ticket.priority} /> from {ticket.requesterName} &lt;{ticket.requesterEmail}&gt;
        </p>

        <article className="message customer">
          <header>{ticket.requesterName} · {fmt.format(ticket.createdAt)}</header>
          <p>{ticket.body}</p>
        </article>

        {ticket.comments.map((c) => (
          <article key={c.id} className={`message ${c.authorType === "AGENT" ? "agent" : "customer"} ${c.internal ? "internal" : ""}`}>
            <header>
              {c.authorType === "AGENT" ? c.agent?.name ?? "Agent" : ticket.requesterName} · {fmt.format(c.createdAt)}
              {c.internal && <span className="badge">internal</span>}
            </header>
            <p>{c.body}</p>
          </article>
        ))}

        {ticket.status !== "CLOSED" && <ReplyForm ticketId={ticket.id} agents={agents} />}
      </section>

      <TicketControls
        ticketId={ticket.id}
        status={ticket.status}
        nextStatuses={allowedNext(ticket.status)}
        priority={ticket.priority}
        assigneeId={ticket.assigneeId}
        agents={agents}
      />
    </div>
  );
}
