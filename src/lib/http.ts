import { NextResponse } from "next/server";
import { TicketError, type TicketErrorCode } from "./tickets";

const STATUS: Record<TicketErrorCode, number> = {
  NOT_FOUND: 404,
  BAD_TRANSITION: 409,
  CLOSED: 409,
  UNKNOWN_AGENT: 422,
};

export async function readJson(req: Request): Promise<unknown> {
  return req.json().catch(() => null);
}

/** Converts known domain errors to JSON responses and rethrows the rest. */
export function handleError(err: unknown) {
  if (err instanceof TicketError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: STATUS[err.code] });
  }
  throw err;
}
