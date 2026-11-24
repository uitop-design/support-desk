import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { bumpStatus } from "./counters";
import { enqueueNotification } from "./notifications";
import { pickAssignee } from "./assign";
import { canTransition, resolvedAtFor, statusAfterComment } from "./workflow";
import type { CommentInput, TicketCreate, TicketListQuery } from "./validation";
import { ticketUpdateSchema } from "./validation";
import type { z } from "zod";

export type TicketUpdate = z.infer<typeof ticketUpdateSchema>;

export type TicketErrorCode = "NOT_FOUND" | "BAD_TRANSITION" | "UNKNOWN_AGENT" | "CLOSED";

export class TicketError extends Error {
  constructor(public code: TicketErrorCode, message: string) {
    super(message);
  }
}

export function buildWhere(f: Partial<TicketListQuery>): Prisma.TicketWhereInput {
  return {
    status: f.status,
    priority: f.priority,
    ...(f.assignee === "unassigned" ? { assigneeId: null } : f.assignee ? { assigneeId: f.assignee } : {}),
    ...(f.q
      ? {
          OR: [
            { subject: { contains: f.q, mode: "insensitive" } },
            { requesterEmail: { contains: f.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

export async function listTickets(f: TicketListQuery) {
  const where = buildWhere(f);
  const [items, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      include: { assignee: { select: { id: true, name: true } } },
      orderBy: { updatedAt: "desc" },
      skip: (f.page - 1) * f.limit,
      take: f.limit,
    }),
    prisma.ticket.count({ where }),
  ]);
  return { items, total, page: f.page, limit: f.limit };
}

export function getTicket(id: string) {
  return prisma.ticket.findUnique({
    where: { id },
    include: {
      assignee: { select: { id: true, name: true } },
      comments: { orderBy: { createdAt: "asc" }, include: { agent: { select: { id: true, name: true } } } },
    },
  });
}

export function listActiveAgents() {
  return prisma.agent.findMany({
    where: { active: true },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });
}

export async function createTicket(input: TicketCreate) {
  const assigneeId = process.env.AUTO_ASSIGN === "false" ? null : await pickAssignee();
  const ticket = await prisma.ticket.create({ data: { ...input, assigneeId } });
  await bumpStatus(null, ticket.status);
  await enqueueNotification({
    type: "ticket.created",
    ticketId: ticket.id,
    to: ticket.requesterEmail,
    subject: `[#${ticket.number}] ${ticket.subject}`,
    text: "We received your request and will get back to you soon.",
  });
  return ticket;
}

export async function updateTicket(id: string, patch: TicketUpdate) {
  const current = await prisma.ticket.findUnique({ where: { id }, select: { status: true, assigneeId: true } });
  if (!current) throw new TicketError("NOT_FOUND", "Ticket not found");

  const { status, priority, assigneeId } = patch;
  if (status && !canTransition(current.status, status)) {
    throw new TicketError("BAD_TRANSITION", `Cannot move ticket from ${current.status} to ${status}`);
  }
  let newAssignee: { email: string } | null = null;
  if (assigneeId) {
    newAssignee = await prisma.agent.findFirst({ where: { id: assigneeId, active: true }, select: { email: true } });
    if (!newAssignee) throw new TicketError("UNKNOWN_AGENT", "Unknown or inactive agent");
  }

  const ticket = await prisma.ticket.update({
    where: { id },
    data: {
      status,
      priority,
      assigneeId,
      resolvedAt: status ? resolvedAtFor(current.status, status) : undefined,
    },
  });
  if (status) await bumpStatus(current.status, status);
  if (newAssignee && assigneeId !== current.assigneeId) {
    await enqueueNotification({
      type: "ticket.assigned",
      ticketId: id,
      to: newAssignee.email,
      subject: `[#${ticket.number}] assigned to you: ${ticket.subject}`,
      text: `Open the ticket in the inbox: /tickets/${id}`,
    });
  }
  return ticket;
}

export async function addComment(ticketId: string, input: CommentInput) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { status: true, number: true, subject: true, requesterEmail: true },
  });
  if (!ticket) throw new TicketError("NOT_FOUND", "Ticket not found");
  if (ticket.status === "CLOSED") throw new TicketError("CLOSED", "Ticket is closed");

  const { body, authorType, agentId, internal } = input;
  const nextStatus = statusAfterComment(ticket.status, authorType, internal);

  const [comment] = await prisma.$transaction([
    prisma.comment.create({ data: { ticketId, body, authorType, agentId, internal } }),
    prisma.ticket.update({
      where: { id: ticketId },
      data: { status: nextStatus, resolvedAt: resolvedAtFor(ticket.status, nextStatus) },
    }),
  ]);
  await bumpStatus(ticket.status, nextStatus);

  if (authorType === "AGENT" && !internal) {
    await enqueueNotification({
      type: "ticket.replied",
      ticketId,
      to: ticket.requesterEmail,
      subject: `Re: [#${ticket.number}] ${ticket.subject}`,
      text: body,
    });
  }
  return comment;
}
