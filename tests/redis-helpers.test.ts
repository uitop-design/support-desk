import { beforeEach, describe, expect, it, vi } from "vitest";

const hash = new Map<string, number>();
let cursor = 0;
const queue: string[] = [];

function multi() {
  const ops: (() => void)[] = [];
  const chain = {
    hincrby(_key: string, field: string, by: number) {
      ops.push(() => hash.set(field, (hash.get(field) ?? 0) + by));
      return chain;
    },
    del() {
      ops.push(() => hash.clear());
      return chain;
    },
    hset(_key: string, values: Record<string, number>) {
      ops.push(() => Object.entries(values).forEach(([k, v]) => hash.set(k, v)));
      return chain;
    },
    async exec() {
      ops.forEach((op) => op());
      return [];
    },
  };
  return chain;
}

vi.mock("@/lib/redis", () => ({
  redis: {
    multi: () => multi(),
    hgetall: vi.fn(async () => Object.fromEntries([...hash].map(([k, v]) => [k, String(v)]))),
    incr: vi.fn(async () => ++cursor),
    lpush: vi.fn(async (_k: string, v: string) => queue.unshift(v)),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    agent: { findMany: vi.fn() },
    ticket: { groupBy: vi.fn() },
  },
}));

const { prisma } = await import("@/lib/prisma");
const { redis } = await import("@/lib/redis");
const { bumpStatus, getStatusCounts } = await import("@/lib/counters");
const { pickAssignee } = await import("@/lib/assign");
const { enqueueNotification, NOTIFY_QUEUE } = await import("@/lib/notifications");

describe("status counters", () => {
  beforeEach(() => {
    hash.clear();
    vi.clearAllMocks();
  });

  it("moves tickets between buckets", async () => {
    await bumpStatus(null, "OPEN");
    await bumpStatus(null, "OPEN");
    await bumpStatus("OPEN", "PENDING");
    const counts = await getStatusCounts();
    expect(counts).toEqual({ OPEN: 1, PENDING: 1, RESOLVED: 0, CLOSED: 0 });
  });

  it("does nothing when the status does not change", async () => {
    await bumpStatus(null, "OPEN");
    await bumpStatus("OPEN", "OPEN");
    expect((await getStatusCounts()).OPEN).toBe(1);
  });

  it("rebuilds from the database when the hash is empty", async () => {
    vi.mocked(prisma.ticket.groupBy).mockResolvedValue([
      { status: "OPEN", _count: { _all: 4 } },
      { status: "CLOSED", _count: { _all: 2 } },
    ] as never);
    const counts = await getStatusCounts();
    expect(counts).toEqual({ OPEN: 4, PENDING: 0, RESOLVED: 0, CLOSED: 2 });
    expect(hash.get("OPEN")).toBe(4);
  });
});

describe("round-robin assignment", () => {
  beforeEach(() => {
    cursor = 0;
    vi.mocked(prisma.agent.findMany).mockResolvedValue([{ id: "a" }, { id: "b" }, { id: "c" }] as never);
  });

  it("cycles through active agents", async () => {
    const picks = [];
    for (let i = 0; i < 4; i++) picks.push(await pickAssignee());
    expect(picks).toEqual(["a", "b", "c", "a"]);
  });

  it("returns null without agents", async () => {
    vi.mocked(prisma.agent.findMany).mockResolvedValue([]);
    expect(await pickAssignee()).toBeNull();
  });

  it("still picks someone when redis is down", async () => {
    vi.mocked(redis.incr).mockRejectedValueOnce(new Error("down"));
    expect(["a", "b", "c"]).toContain(await pickAssignee());
  });
});

describe("notification queue", () => {
  it("pushes json payloads to the queue", async () => {
    await enqueueNotification({ type: "ticket.created", ticketId: "t1", to: "a@b.c", subject: "s", text: "x" });
    expect(redis.lpush).toHaveBeenCalledWith(NOTIFY_QUEUE, expect.any(String));
    expect(JSON.parse(queue[0])).toMatchObject({ type: "ticket.created", to: "a@b.c" });
  });
});
