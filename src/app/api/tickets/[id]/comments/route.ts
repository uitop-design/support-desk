import { NextRequest, NextResponse } from "next/server";
import { commentSchema } from "@/lib/validation";
import { addComment } from "@/lib/tickets";
import { handleError, readJson } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const parsed = commentSchema.safeParse(await readJson(req));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    return NextResponse.json(await addComment((await params).id, parsed.data), { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
