import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ticketCreateSchema, ticketListSchema } from "@/lib/validation";
import { bumpStatus } from "@/lib/counters";
import { enqueueNotification } from "@/lib/notifications";
import { pickAssignee } from "@/lib/assign";

export async function GET(req: NextRequest) {
  const parsed = ticketListSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { status, priority, assignee, q, page, limit } = parsed.data;

  const where: Prisma.TicketWhereInput = {
    status,
    priority,
    ...(assignee === "unassigned" ? { assigneeId: null } : assignee ? { assigneeId: assignee } : {}),
    ...(q
      ? {
          OR: [
            { subject: { contains: q, mode: "insensitive" } },
            { requesterEmail: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      include: { assignee: { select: { id: true, name: true } } },
      orderBy: [{ updatedAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.ticket.count({ where }),
  ]);
  return NextResponse.json({ items, total, page, limit });
}

export async function POST(req: NextRequest) {
  const parsed = ticketCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const assigneeId = process.env.AUTO_ASSIGN === "false" ? null : await pickAssignee();
  const ticket = await prisma.ticket.create({ data: { ...parsed.data, assigneeId } });
  await bumpStatus(null, ticket.status);
  await enqueueNotification({
    type: "ticket.created",
    ticketId: ticket.id,
    to: ticket.requesterEmail,
    subject: `[#${ticket.number}] ${ticket.subject}`,
    text: "We received your request and will get back to you soon.",
  });
  return NextResponse.json(ticket, { status: 201 });
}
