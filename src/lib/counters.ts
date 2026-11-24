import { prisma } from "./prisma";
import { redis } from "./redis";
import { STATUSES } from "./validation";
import type { Status } from "./workflow";

const KEY = "tickets:counts";

export type StatusCounts = Record<Status, number>;

function empty(): StatusCounts {
  return Object.fromEntries(STATUSES.map((s) => [s, 0])) as StatusCounts;
}

/** Move one ticket between status buckets. `from` is null for new tickets. */
export async function bumpStatus(from: Status | null, to: Status): Promise<void> {
  try {
    const tx = redis.multi();
    if (from) tx.hincrby(KEY, from, -1);
    tx.hincrby(KEY, to, 1);
    await tx.exec();
  } catch {
    // counters are rebuilt from the database when missing
  }
}

/** Counts per status from Redis, rebuilt from Postgres if the hash is missing. */
export async function getStatusCounts(): Promise<StatusCounts> {
  try {
    const raw = await redis.hgetall(KEY);
    if (Object.keys(raw).length > 0) {
      const counts = empty();
      for (const s of STATUSES) counts[s] = Number(raw[s] ?? 0);
      return counts;
    }
  } catch {
    // fall through to the database
  }
  return rebuildCounts();
}

export async function rebuildCounts(): Promise<StatusCounts> {
  const rows = await prisma.ticket.groupBy({ by: ["status"], _count: { _all: true } });
  const counts = empty();
  for (const r of rows) counts[r.status] = r._count._all;
  try {
    await redis.multi().del(KEY).hset(KEY, counts).exec();
  } catch {
    // ignore
  }
  return counts;
}
