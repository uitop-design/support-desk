import { NextRequest, NextResponse } from "next/server";
import { ticketCreateSchema, ticketListSchema } from "@/lib/validation";
import { createTicket, listTickets } from "@/lib/tickets";
import { readJson } from "@/lib/http";

export async function GET(req: NextRequest) {
  const parsed = ticketListSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  return NextResponse.json(await listTickets(parsed.data));
}

export async function POST(req: NextRequest) {
  const parsed = ticketCreateSchema.safeParse(await readJson(req));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  return NextResponse.json(await createTicket(parsed.data), { status: 201 });
}
