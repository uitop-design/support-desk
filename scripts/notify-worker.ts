import Redis from "ioredis";
import { NOTIFY_FAILED, NOTIFY_QUEUE, type Notification } from "../src/lib/notifications";

// A dedicated connection: BRPOP blocks it while waiting for jobs.
const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
const webhook = process.env.NOTIFY_WEBHOOK_URL;

let running = true;

async function deliver(n: Notification) {
  if (!webhook) {
    console.log(`[notify] ${n.type} -> ${n.to}: ${n.subject}`);
    return;
  }
  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(n),
  });
  if (!res.ok) throw new Error(`webhook responded ${res.status}`);
}

async function loop() {
  console.log("[notify] worker started");
  while (running) {
    const item = await redis.brpop(NOTIFY_QUEUE, 5);
    if (!item) continue;
    const [, payload] = item;
    try {
      await deliver(JSON.parse(payload) as Notification);
    } catch (err) {
      console.error("[notify] delivery failed", (err as Error).message);
      await redis.lpush(NOTIFY_FAILED, payload);
    }
  }
  await redis.quit();
}

process.on("SIGINT", () => (running = false));
process.on("SIGTERM", () => (running = false));

loop().catch((err) => {
  console.error(err);
  process.exit(1);
});
