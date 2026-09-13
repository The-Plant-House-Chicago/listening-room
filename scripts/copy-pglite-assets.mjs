import { copyFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const destDir = join(
  process.cwd(),
  ".vercel/output/functions/__server.func/_libs",
);
const srcDir = join(process.cwd(), "node_modules/@electric-sql/pglite/dist");

if (!existsSync(destDir) || !existsSync(srcDir)) process.exit(0);

for (const name of readdirSync(srcDir)) {
  if (!name.endsWith(".wasm") && !name.endsWith(".data")) continue;
  copyFileSync(join(srcDir, name), join(destDir, name));
}
