import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});

const prisma = new PrismaClient({ adapter });

const testProjectCodes = ["PR-100", "PR-101"];

async function main() {
  const projects = await prisma.project.findMany({
    where: {
      projectCode: {
        in: testProjectCodes,
      },
    },
    select: {
      id: true,
      projectCode: true,
    },
  });

  const projectIds = projects.map((p) => p.id);

  console.log("Projects found:", projects);

  if (projectIds.length === 0) {
    console.log("No matching projects found.");
    return;
  }

  // Delete child records first
  await prisma.projectWorkstream.deleteMany({
    where: {
      projectId: {
        in: projectIds,
      },
    },
  });

  await prisma.project.deleteMany({
    where: {
      id: {
        in: projectIds,
      },
    },
  });

  console.log("Deleted projects:", testProjectCodes);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });