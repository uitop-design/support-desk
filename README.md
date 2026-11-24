# Support Desk

A small helpdesk for teams that answer customer email. Customers submit requests through a public
form, agents work them in a shared inbox, reply, leave internal notes and move tickets through a
simple workflow.

## Features

- Public request form, ticket numbers per request
- Inbox with filters by status, priority, assignee and text search
- Conversation view with public replies and internal notes
- Status workflow: `OPEN -> PENDING -> RESOLVED -> CLOSED`, closed tickets are final
- Customer replies re-open pending/resolved tickets, agent replies move open ones to pending
- Round-robin auto assignment of new tickets
- Live status counters and an email notification queue on Redis

## Stack

- Next.js 15 (App Router), React 19, TypeScript
- PostgreSQL + Prisma
- Redis (ioredis): counters, assignment cursor, notification queue
- Zod, Vitest

## Setup

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:migrate
npm run db:seed
npm run dev              # app on http://localhost:3000
npm run worker:notify    # in a second terminal, delivers queued emails
```

## Environment

| Variable             | Default                  | Description                                         |
| -------------------- | ------------------------ | --------------------------------------------------- |
| `DATABASE_URL`       | -                        | Postgres connection string                          |
| `REDIS_URL`          | `redis://localhost:6379` | Redis connection string                             |
| `AUTO_ASSIGN`        | `true`                   | Assign new tickets to active agents in turn         |
| `NOTIFY_WEBHOOK_URL` | empty                    | If set, the worker POSTs notifications here instead of logging them |

## Redis usage

| Key                          | Type    | Purpose                                                    |
| ---------------------------- | ------- | ---------------------------------------------------------- |
| `tickets:counts`             | hash    | Ticket count per status for the inbox header               |
| `assign:cursor`              | string  | Round-robin position shared by all app instances           |
| `queue:notifications`        | list    | Outgoing emails, consumed by `scripts/notify-worker.ts`    |
| `queue:notifications:failed` | list    | Payloads the worker could not deliver                      |

Counters are rebuilt from Postgres whenever the hash is missing, so flushing Redis is safe.

## API

| Method | Path                         | Body / query                                            |
| ------ | ---------------------------- | ------------------------------------------------------- |
| GET    | `/api/tickets`               | `status`, `priority`, `assignee` (id or `unassigned`), `q`, `page`, `limit` |
| POST   | `/api/tickets`               | `subject`, `body`, `requesterName`, `requesterEmail`, `priority?` |
| GET    | `/api/tickets/:id`           | Ticket with comments                                    |
| PATCH  | `/api/tickets/:id`           | `status?`, `priority?`, `assigneeId?` (null to unassign) |
| POST   | `/api/tickets/:id/comments`  | `body`, `authorType`, `agentId?`, `internal?`           |
| GET    | `/api/agents`                | Active agents                                           |
| GET    | `/api/stats`                 | Counts per status                                       |

Errors: `400` validation, `404` unknown ticket, `409` invalid status change or closed ticket,
`422` unknown agent.

## Notes

Agent authentication is not included: the app is meant to run behind the company SSO proxy.
The reply form lets you pick which agent is replying, which is handy for demos.

## Project structure

```
prisma/                    schema and seed data
scripts/notify-worker.ts   Redis queue consumer
src/app/                   pages (inbox, ticket, request form) and API routes
src/components/            client components
src/lib/tickets.ts         ticket service
src/lib/workflow.ts        status rules
src/lib/counters.ts        Redis status counters
src/lib/assign.ts          round-robin assignment
src/lib/notifications.ts   notification queue producer
tests/                     Vitest suites
```
