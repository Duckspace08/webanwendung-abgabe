// tools/scripts/ensure-env.mjs
import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve(process.cwd(), ".env");
const examplePath = path.resolve(process.cwd(), ".env.example");

if (!fs.existsSync(envPath)) {
  if (!fs.existsSync(examplePath)) {
    console.warn("[ensure-env] .env.example not found. Skipping.");
    process.exit(0);
  }
  fs.copyFileSync(examplePath, envPath);
  console.log("[ensure-env] Created .env from .env.example");
} else {
  console.log("[ensure-env] .env already exists");
}