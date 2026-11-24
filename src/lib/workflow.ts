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
