import type { STATUSES } from "./validation";

export type Status = (typeof STATUSES)[number];

const TRANSITIONS: Record<Status, Status[]> = {
  OPEN: ["PENDING", "RESOLVED", "CLOSED"],
  PENDING: ["OPEN", "RESOLVED", "CLOSED"],
  RESOLVED: ["OPEN", "CLOSED"],
  CLOSED: [],
};

/** Closed tickets are final; everything else follows the table above. */
export function canTransition(from: Status, to: Status): boolean {
  return from === to || TRANSITIONS[from].includes(to);
}

export function allowedNext(from: Status): Status[] {
  return TRANSITIONS[from];
}

/**
 * Status a ticket should get after a new comment:
 * - a customer reply re-opens a pending or resolved ticket;
 * - a public agent reply on an open ticket means we now wait for the customer.
 * Internal notes never change the status.
 */
export function statusAfterComment(current: Status, authorType: "CUSTOMER" | "AGENT", internal: boolean): Status {
  if (internal || current === "CLOSED") return current;
  if (authorType === "CUSTOMER" && (current === "PENDING" || current === "RESOLVED")) return "OPEN";
  if (authorType === "AGENT" && current === "OPEN") return "PENDING";
  return current;
}
