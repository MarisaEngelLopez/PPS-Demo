import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "marisa@example.com" },
    update: {},
    create: {
      email: "marisa@example.com",
      fullName: "Marisa Engel",
      preferredLanguage: "EN",
    },
  });

  const status = await prisma.projectStatus.upsert({
    where: { code: "ACTIVE" },
    update: {},
    create: {
      code: "ACTIVE",
      name: "Active",
      nameEs: "Activo",
      sortOrder: 10,
    },
  });

  const projectType = await prisma.projectType.upsert({
  where: { code: "IT_IMPL" },
  update: {},
  create: {
    code: "IT_IMPL",
    name: "IT Implementation",
    nameEs: "Implantación IT",
    description: "Technology or ERP implementation project",
    descriptionEs: "Proyecto de implantación tecnológica o ERP",
    sortOrder: 10,
  },
});

  await prisma.project.upsert({
    where: { projectCode: "PRJ-001" },
    update: {},
    create: {
      projectCode: "PRJ-001",
      name: "First Project Operations System Test",
      nameEs: "Primera prueba del sistema de gestión de proyectos",
      description: "Initial test project created locally.",
      descriptionEs: "Proyecto inicial de prueba creado en local.",
      projectTypeId: projectType.id,
      statusId: status.id,
      projectManagerId: user.id,
      sponsorId: user.id,
      startDate: new Date("2026-04-29"),
      reportingCadence: "WEEKLY",
      defaultLanguage: "EN",
      secondaryLanguage: "ES",
      reportLanguageMode: "BILINGUAL",
      healthStatus: "GREEN",
      isActive: true,
    },
  });

  console.log("Seed completed: first project created.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });