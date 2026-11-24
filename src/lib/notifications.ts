import { redis } from "./redis";

export const NOTIFY_QUEUE = "queue:notifications";
export const NOTIFY_FAILED = "queue:notifications:failed";

export type Notification = {
  type: "ticket.created" | "ticket.replied" | "ticket.assigned";
  ticketId: string;
  to: string;
  subject: string;
  text: string;
};

/**
 * Emails are not sent inside the request: they go to a Redis list and
 * a separate worker (scripts/notify-worker.ts) delivers them.
 */
export async function enqueueNotification(n: Notification): Promise<void> {
  try {
    await redis.lpush(NOTIFY_QUEUE, JSON.stringify({ ...n, queuedAt: new Date().toISOString() }));
  } catch (err) {
    console.warn("[notify] could not enqueue", n.type, (err as Error).message);
  }
}
