import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { commentSchema } from "@/lib/validation";
import { statusAfterComment } from "@/lib/workflow";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const parsed = commentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const ticket = await prisma.ticket.findUnique({ where: { id }, select: { status: true } });
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  if (ticket.status === "CLOSED") return NextResponse.json({ error: "Ticket is closed" }, { status: 409 });

  const { body, authorType, agentId, internal } = parsed.data;
  const nextStatus = statusAfterComment(ticket.status, authorType, internal);

  const [comment] = await prisma.$transaction([
    prisma.comment.create({ data: { ticketId: id, body, authorType, agentId, internal } }),
    prisma.ticket.update({ where: { id }, data: { status: nextStatus } }),
  ]);
  return NextResponse.json(comment, { status: 201 });
}
