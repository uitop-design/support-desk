import { NextRequest, NextResponse } from "next/server";
import { ticketUpdateSchema } from "@/lib/validation";
import { getTicket, updateTicket } from "@/lib/tickets";
import { handleError, readJson } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const ticket = await getTicket((await params).id);
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  return NextResponse.json(ticket);
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const parsed = ticketUpdateSchema.safeParse(await readJson(req));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    return NextResponse.json(await updateTicket((await params).id, parsed.data));
  } catch (err) {
    return handleError(err);
  }
}
