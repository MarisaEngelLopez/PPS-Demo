import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import fs from "node:fs";
import path from "node:path";

const ownerUserId = "f5f52a98-4a18-48bc-b0f7-788f1e3c9288";
const defaultOwnerEmail = "marisa.engel@protervitas.com";

type Mode = "dry-run" | "apply";

function argValue(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasArg(name: string) {
  return process.argv.includes(name);
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function resolveDatabaseUrl(databaseUrl: string) {
  if (!databaseUrl.startsWith("file:")) {
    fail("Only SQLite file: database URLs are supported by this bootstrap script.");
  }

  const rawPath = databaseUrl.slice(5);
  const databasePath = path.isAbsolute(rawPath)
    ? rawPath
    : path.resolve(process.cwd(), rawPath);

  return {
    databasePath,
    databaseUrl: `file:${databasePath.replaceAll("\\", "/")}`,
  };
}

const databaseArg = argValue("--database");
if (!databaseArg) {
  fail("Missing required --database file:... argument.");
}

const dryRun = hasArg("--dry-run");
const apply = hasArg("--apply");
if (dryRun === apply) {
  fail("Choose exactly one mode: --dry-run or --apply.");
}

const mode: Mode = apply ? "apply" : "dry-run";
const email = argValue("--email") || defaultOwnerEmail;
const password = argValue("--password") || process.env.PPS_BOOTSTRAP_PASSWORD;

if (mode === "apply" && (!password || password.length < 12)) {
  fail("Apply mode requires --password or PPS_BOOTSTRAP_PASSWORD with at least 12 characters.");
}

const { databasePath, databaseUrl } = resolveDatabaseUrl(databaseArg);

if (!fs.existsSync(databasePath)) {
  fail(`Database file does not exist: ${databasePath}`);
}

const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
const prisma = new PrismaClient({ adapter });

const auth = betterAuth({
  baseURL: "http://localhost:3001",
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    minPasswordLength: 6,
  },
  user: {
    modelName: "AuthUser",
    additionalFields: {
      appUserId: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
  session: {
    modelName: "AuthSession",
  },
  account: {
    modelName: "AuthAccount",
  },
  verification: {
    modelName: "AuthVerification",
  },
});

async function main() {
  const owner = await prisma.user.findUnique({
    where: { id: ownerUserId },
    select: { id: true, fullName: true },
  });

  if (!owner) {
    fail(`Owner operational User not found: ${ownerUserId}`);
  }

  const ownerRole = await prisma.role.findUnique({
    where: { code: "OWNER_ADMIN" },
    select: { id: true },
  });
  const liveWorkspace = await prisma.workspace.findUnique({
    where: { code: "LIVE" },
    select: { id: true },
  });
  const demoWorkspace = await prisma.workspace.findUnique({
    where: { code: "DEMO" },
    select: { id: true },
  });

  if (!ownerRole || !liveWorkspace || !demoWorkspace) {
    fail("Missing Role/Workspace seed rows. Run db:security-seed:v3-3 first.");
  }

  const existingAuthUser = await prisma.authUser.findUnique({
    where: { email },
    select: { id: true, email: true, appUserId: true },
  });

  const plan = {
    databasePath,
    email,
    ownerUserId,
    mode,
    willCreateAuthUser: !existingAuthUser,
    willLinkAuthUser: !existingAuthUser || existingAuthUser.appUserId !== ownerUserId,
    willUpsertWorkspaceMemberships: ["LIVE", "DEMO"],
  };

  if (mode === "dry-run") {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  let authUserId = existingAuthUser?.id;

  if (!authUserId) {
    const result = await auth.api.signUpEmail({
      body: {
        email,
        password: password as string,
        name: owner.fullName,
      },
    });
    authUserId = result.user.id;
  }

  await prisma.authUser.update({
    where: { id: authUserId },
    data: { appUserId: ownerUserId },
  });

  for (const workspaceId of [liveWorkspace.id, demoWorkspace.id]) {
    await prisma.workspaceMembership.upsert({
      where: {
        userId_workspaceId: {
          userId: ownerUserId,
          workspaceId,
        },
      },
      create: {
        userId: ownerUserId,
        workspaceId,
        roleId: ownerRole.id,
      },
      update: {
        roleId: ownerRole.id,
        isActive: true,
      },
    });
  }

  console.log(JSON.stringify({ ...plan, authUserId }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
