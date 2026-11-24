import { NextResponse } from "next/server";
import { getStatusCounts } from "@/lib/counters";

export async function GET() {
  return NextResponse.json(await getStatusCounts());
}
