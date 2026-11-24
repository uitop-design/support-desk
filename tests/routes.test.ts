import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/tickets", async () => {
  class TicketError extends Error {
    constructor(public code: string, message: string) {
      super(message);
    }
  }
  return {
    TicketError,
    listTickets: vi.fn(),
    createTicket: vi.fn(),
    getTicket: vi.fn(),
    updateTicket: vi.fn(),
    addComment: vi.fn(),
  };
});

const service = await import("@/lib/tickets");
const ticketsRoute = await import("@/app/api/tickets/route");
const ticketRoute = await import("@/app/api/tickets/[id]/route");
const commentsRoute = await import("@/app/api/tickets/[id]/comments/route");

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const json = (url: string, method: string, body: unknown) =>
  new NextRequest(url, { method, body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });

describe("ticket routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists tickets with parsed filters", async () => {
    vi.mocked(service.listTickets).mockResolvedValue({ items: [], total: 0, page: 1, limit: 25 } as never);
    const res = await ticketsRoute.GET(new NextRequest("http://x/api/tickets?status=OPEN&assignee=unassigned"));
    expect(res.status).toBe(200);
    expect(service.listTickets).toHaveBeenCalledWith(
      expect.objectContaining({ status: "OPEN", assignee: "unassigned", page: 1, limit: 25 }),
    );
  });

  it("rejects an unknown status filter", async () => {
    const res = await ticketsRoute.GET(new NextRequest("http://x/api/tickets?status=DONE"));
    expect(res.status).toBe(400);
  });

  it("creates a ticket", async () => {
    vi.mocked(service.createTicket).mockResolvedValue({ id: "t1", number: 12 } as never);
    const res = await ticketsRoute.POST(
      json("http://x/api/tickets", "POST", {
        subject: "Login issue",
        body: "Cannot log in",
        requesterName: "Ann",
        requesterEmail: "ann@example.com",
      }),
    );
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: "t1", number: 12 });
  });

  it("maps a bad transition to 409", async () => {
    vi.mocked(service.updateTicket).mockRejectedValue(
      new service.TicketError("BAD_TRANSITION", "Cannot move ticket from CLOSED to OPEN"),
    );
    const res = await ticketRoute.PATCH(json("http://x/api/tickets/t1", "PATCH", { status: "OPEN" }), ctx("t1"));
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("BAD_TRANSITION");
  });

  it("returns 404 for a missing ticket", async () => {
    vi.mocked(service.getTicket).mockResolvedValue(null);
    const res = await ticketRoute.GET(new NextRequest("http://x/api/tickets/nope"), ctx("nope"));
    expect(res.status).toBe(404);
  });

  it("validates comments before calling the service", async () => {
    const res = await commentsRoute.POST(
      json("http://x/api/tickets/t1/comments", "POST", { body: "hi", authorType: "AGENT" }),
      ctx("t1"),
    );
    expect(res.status).toBe(400);
    expect(service.addComment).not.toHaveBeenCalled();
  });

  it("adds a comment", async () => {
    vi.mocked(service.addComment).mockResolvedValue({ id: "c1" } as never);
    const res = await commentsRoute.POST(
      json("http://x/api/tickets/t1/comments", "POST", { body: "Thanks!", authorType: "CUSTOMER" }),
      ctx("t1"),
    );
    expect(res.status).toBe(201);
    expect(service.addComment).toHaveBeenCalledWith("t1", { body: "Thanks!", authorType: "CUSTOMER", internal: false });
  });
});
