import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ticketUpdateSchema } from "@/lib/validation";
import { canTransition } from "@/lib/workflow";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: (await params).id },
    include: {
      assignee: { select: { id: true, name: true } },
      comments: { orderBy: { createdAt: "asc" }, include: { agent: { select: { id: true, name: true } } } },
    },
  });
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  return NextResponse.json(ticket);
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const parsed = ticketUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const current = await prisma.ticket.findUnique({ where: { id }, select: { status: true } });
  if (!current) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const { status, priority, assigneeId } = parsed.data;
  if (status && !canTransition(current.status, status)) {
    return NextResponse.json({ error: `Cannot move ticket from ${current.status} to ${status}` }, { status: 409 });
  }
  if (assigneeId) {
    const agent = await prisma.agent.findFirst({ where: { id: assigneeId, active: true } });
    if (!agent) return NextResponse.json({ error: "Unknown or inactive agent" }, { status: 422 });
  }

  const ticket = await prisma.ticket.update({
    where: { id },
    data: { status, priority, assigneeId },
  });
  return NextResponse.json(ticket);
}
