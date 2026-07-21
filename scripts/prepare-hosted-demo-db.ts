import fs from "node:fs";
import path from "node:path";

const sourceDatabasePath = path.resolve(process.cwd(), "data", "pps-demo-package.db");

function databasePathFromUrl(databaseUrl: string) {
  if (!databaseUrl.startsWith("file:")) {
    throw new Error("Hosted demo expects DATABASE_URL to use a file: SQLite URL.");
  }

  return databaseUrl.slice("file:".length);
}

const databaseUrl = process.env.DATABASE_URL ?? "file:/var/data/pps-demo-package.db";
const targetDatabasePath = databasePathFromUrl(databaseUrl);
const bundledDatabaseUrl = "file:./data/pps-demo-package.db";

if (!fs.existsSync(sourceDatabasePath)) {
  throw new Error(`Bundled demo database is missing: ${sourceDatabasePath}`);
}

try {
  fs.mkdirSync(path.dirname(targetDatabasePath), { recursive: true });

  if (!fs.existsSync(targetDatabasePath)) {
    fs.copyFileSync(sourceDatabasePath, targetDatabasePath);
    console.log(`Initialized hosted demo database at ${targetDatabasePath}`);
  } else {
    console.log(`Hosted demo database already exists at ${targetDatabasePath}`);
  }
} catch (error) {
  console.warn(
    `Could not initialize hosted demo database at ${targetDatabasePath}. Falling back to bundled demo database.`,
  );
  console.warn(error);
  process.env.DATABASE_URL = bundledDatabaseUrl;
}
