import Redis from "ioredis";

const g = globalThis as unknown as { redis?: Redis };

export const redis =
  g.redis ??
  new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
  });

redis.on("error", (err) => console.warn("[redis]", err.message));

if (process.env.NODE_ENV !== "production") g.redis = redis;
