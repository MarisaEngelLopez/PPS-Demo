import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const sourcePath = path.resolve(repoRoot, "..", "dev.db");
const destinationPath = path.resolve(repoRoot, "data", "dev-sandbox.db");
const overwrite = process.argv.includes("--overwrite");

if (!fs.existsSync(sourcePath)) {
  console.error(`Protected live database was not found: ${sourcePath}`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(destinationPath), { recursive: true });

if (fs.existsSync(destinationPath) && !overwrite) {
  console.error(
    `Sandbox database already exists: ${destinationPath}\nUse --overwrite only when you intentionally want to refresh the sandbox copy.`,
  );
  process.exit(1);
}

fs.copyFileSync(sourcePath, destinationPath);

console.log(`Created sandbox database copy: ${destinationPath}`);
console.log(`Source live database left untouched: ${sourcePath}`);
