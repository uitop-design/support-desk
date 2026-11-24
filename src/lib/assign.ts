import { prisma } from "./prisma";
import { redis } from "./redis";

const CURSOR_KEY = "assign:cursor";

/**
 * Round-robin over active agents. The cursor lives in Redis so several app
 * instances share it; without Redis we fall back to a random pick.
 */
export async function pickAssignee(): Promise<string | null> {
  const agents = await prisma.agent.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (agents.length === 0) return null;

  let n: number;
  try {
    n = await redis.incr(CURSOR_KEY);
  } catch {
    n = Math.floor(Math.random() * agents.length) + 1;
  }
  return agents[(n - 1) % agents.length].id;
}
