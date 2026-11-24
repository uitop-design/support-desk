import { describe, expect, it } from "vitest";
import { allowedNext, canTransition, resolvedAtFor, statusAfterComment } from "@/lib/workflow";
import { commentSchema, ticketCreateSchema, ticketUpdateSchema } from "@/lib/validation";

describe("status transitions", () => {
  it("allows normal flow", () => {
    expect(canTransition("OPEN", "PENDING")).toBe(true);
    expect(canTransition("PENDING", "RESOLVED")).toBe(true);
    expect(canTransition("RESOLVED", "OPEN")).toBe(true);
  });

  it("treats closed as final", () => {
    expect(allowedNext("CLOSED")).toEqual([]);
    expect(canTransition("CLOSED", "OPEN")).toBe(false);
  });

  it("does not allow skipping back from resolved to pending", () => {
    expect(canTransition("RESOLVED", "PENDING")).toBe(false);
  });
});

describe("statusAfterComment", () => {
  it("re-opens on customer reply", () => {
    expect(statusAfterComment("PENDING", "CUSTOMER", false)).toBe("OPEN");
    expect(statusAfterComment("RESOLVED", "CUSTOMER", false)).toBe("OPEN");
  });

  it("waits for the customer after a public agent reply", () => {
    expect(statusAfterComment("OPEN", "AGENT", false)).toBe("PENDING");
  });

  it("ignores internal notes", () => {
    expect(statusAfterComment("OPEN", "AGENT", true)).toBe("OPEN");
  });
});

describe("resolvedAtFor", () => {
  const now = new Date("2026-01-01T00:00:00Z");

  it("stamps on resolve and clears on re-open", () => {
    expect(resolvedAtFor("OPEN", "RESOLVED", now)).toBe(now);
    expect(resolvedAtFor("RESOLVED", "OPEN", now)).toBeNull();
  });

  it("leaves the value alone when nothing changes", () => {
    expect(resolvedAtFor("OPEN", "OPEN", now)).toBeUndefined();
    expect(resolvedAtFor("RESOLVED", "CLOSED", now)).toBeUndefined();
  });
});

describe("validation", () => {
  it("normalizes requester email and defaults priority", () => {
    const t = ticketCreateSchema.parse({
      subject: "Help",
      body: "Something broke",
      requesterName: "Ann",
      requesterEmail: " Ann@Example.com ",
    });
    expect(t.requesterEmail).toBe("ann@example.com");
    expect(t.priority).toBe("NORMAL");
  });

  it("rejects empty updates", () => {
    expect(ticketUpdateSchema.safeParse({}).success).toBe(false);
  });

  it("requires agentId for agent comments and forbids internal customer notes", () => {
    expect(commentSchema.safeParse({ body: "hi", authorType: "AGENT" }).success).toBe(false);
    expect(commentSchema.safeParse({ body: "hi", authorType: "CUSTOMER", internal: true }).success).toBe(false);
    expect(commentSchema.safeParse({ body: "hi", authorType: "AGENT", agentId: "a1", internal: true }).success).toBe(true);
  });
});
