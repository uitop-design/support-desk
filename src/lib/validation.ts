import { z } from "zod";

export const STATUSES = ["OPEN", "PENDING", "RESOLVED", "CLOSED"] as const;
export const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

export const ticketCreateSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  body: z.string().trim().min(1).max(10_000),
  requesterName: z.string().trim().min(1).max(120),
  requesterEmail: z.string().trim().toLowerCase().email(),
  priority: z.enum(PRIORITIES).default("NORMAL"),
});

export const ticketListSchema = z.object({
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assignee: z.string().min(1).optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type TicketCreate = z.infer<typeof ticketCreateSchema>;
export type TicketListQuery = z.infer<typeof ticketListSchema>;

export const ticketUpdateSchema = z
  .object({
    status: z.enum(STATUSES).optional(),
    priority: z.enum(PRIORITIES).optional(),
    assigneeId: z.string().min(1).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });
