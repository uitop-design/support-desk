import { NextResponse } from "next/server";
import { listActiveAgents } from "@/lib/tickets";

export async function GET() {
  return NextResponse.json(await listActiveAgents());
}
