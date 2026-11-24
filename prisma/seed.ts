import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [maria, tom] = await Promise.all([
    prisma.agent.upsert({
      where: { email: "maria@desk.local" },
      update: {},
      create: { name: "Maria Novak", email: "maria@desk.local", role: "ADMIN" },
    }),
    prisma.agent.upsert({
      where: { email: "tom@desk.local" },
      update: {},
      create: { name: "Tom Fischer", email: "tom@desk.local" },
    }),
  ]);

  if ((await prisma.ticket.count()) > 0) return;

  await prisma.ticket.create({
    data: {
      subject: "Cannot reset my password",
      body: "The reset link from your email says it has expired, even when I click it right away.",
      requesterName: "Alex Brown",
      requesterEmail: "alex@example.com",
      priority: "HIGH",
      assigneeId: maria.id,
      comments: {
        create: [
          { authorType: "AGENT", agentId: maria.id, body: "Hi Alex, could you tell us which browser you use?" },
          { authorType: "AGENT", agentId: maria.id, body: "Probably the link TTL bug from last release.", internal: true },
        ],
      },
      status: "PENDING",
    },
  });

  await prisma.ticket.create({
    data: {
      subject: "Invoice for October is missing",
      body: "I can only see invoices up to September in the billing section.",
      requesterName: "Lena Kim",
      requesterEmail: "lena@example.com",
      assigneeId: tom.id,
    },
  });

  await prisma.ticket.create({
    data: {
      subject: "Feature request: dark mode",
      body: "Would love a dark theme for the dashboard.",
      requesterName: "Sam Ortiz",
      requesterEmail: "sam@example.com",
      priority: "LOW",
    },
  });

  console.log("Seeded agents and demo tickets");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
