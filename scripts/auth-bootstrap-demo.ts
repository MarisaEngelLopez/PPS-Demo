import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import fs from "node:fs";
import path from "node:path";

const demoEmail = "demoPPS@pps.demo";
const demoAuthEmail = demoEmail.toLowerCase();
const demoPassword = "demoPPS";

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
const resetPassword = hasArg("--reset-password");
if (dryRun === apply) {
  fail("Choose exactly one mode: --dry-run or --apply.");
}

const mode: Mode = apply ? "apply" : "dry-run";
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
  const [demoWorkspace, liveWorkspace, existingAuthUser] = await Promise.all([
    prisma.workspace.findUnique({
      where: { code: "DEMO" },
      select: { id: true },
    }),
    prisma.workspace.findUnique({
      where: { code: "LIVE" },
      select: { id: true },
    }),
    prisma.authUser.findUnique({
      where: { email: demoAuthEmail },
      select: { id: true, appUserId: true },
    }),
  ]);

  const existingDemoRole = await prisma.role.findUnique({
    where: { code: "DEMO_OPERATOR" },
    select: { id: true },
  });

  if (!demoWorkspace) {
    fail("Missing DEMO workspace. Run db:security-seed:v3-3 first.");
  }

  const existingAppUser = await prisma.user.findUnique({
    where: { email: demoEmail },
    select: { id: true },
  });

  const plan = {
    databasePath,
    mode,
    demoLoginUser: "demoPPS",
    demoEmail,
    demoAuthEmail,
    willCreateOperationalUser: !existingAppUser,
    willCreateAuthUser: !existingAuthUser,
    willCreateDemoRole: !existingDemoRole,
    willLinkAuthUser:
      !existingAuthUser ||
      !existingAppUser ||
      existingAuthUser.appUserId !== existingAppUser.id,
    willResetPassword: resetPassword,
    willUpsertDemoMembership: true,
    willDeactivateLiveMembership: Boolean(liveWorkspace),
  };

  if (mode === "dry-run") {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  const demoRole = await prisma.role.upsert({
    where: { code: "DEMO_OPERATOR" },
    create: { code: "DEMO_OPERATOR", name: "Demo operator" },
    update: { name: "Demo operator", isActive: true },
    select: { id: true },
  });

  const appUser =
    existingAppUser ??
    (await prisma.user.create({
      data: {
        email: demoEmail,
        fullName: "PPS Demo",
        preferredLanguage: "EN",
      },
      select: { id: true },
    }));

  let authUserId = existingAuthUser?.id;

  if (resetPassword && authUserId) {
    await prisma.authSession.deleteMany({ where: { userId: authUserId } });
    await prisma.authAccount.deleteMany({ where: { userId: authUserId } });
    await prisma.authUser.delete({ where: { id: authUserId } });
    authUserId = undefined;
  }

  if (!authUserId) {
    const result = await auth.api.signUpEmail({
      body: {
        email: demoEmail,
        password: demoPassword,
        name: "PPS Demo",
      },
    });
    const createdAuthUser = await prisma.authUser.findUnique({
      where: { email: demoAuthEmail },
      select: { id: true },
    });
    authUserId = createdAuthUser?.id ?? result.user.id;
  }

  await prisma.authUser.update({
    where: { id: authUserId },
    data: {
      appUserId: appUser.id,
      name: "PPS Demo",
      emailVerified: true,
    },
  });

  await prisma.workspaceMembership.upsert({
    where: {
      userId_workspaceId: {
        userId: appUser.id,
        workspaceId: demoWorkspace.id,
      },
    },
    create: {
      userId: appUser.id,
      workspaceId: demoWorkspace.id,
      roleId: demoRole.id,
    },
    update: {
      roleId: demoRole.id,
      isActive: true,
    },
  });

  if (liveWorkspace) {
    await prisma.workspaceMembership.updateMany({
      where: {
        userId: appUser.id,
        workspaceId: liveWorkspace.id,
      },
      data: { isActive: false },
    });
  }

  console.log(JSON.stringify({ ...plan, authUserId, appUserId: appUser.id }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
