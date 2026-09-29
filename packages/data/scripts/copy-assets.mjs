// Copies JSON datasets next to the compiled entry (tsc does not emit JSON).
import { cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
mkdirSync(dist, { recursive: true });
for (const dir of ["geography", "reference"]) {
  cpSync(join(root, dir), join(dist, dir), { recursive: true });
}
console.log("data assets copied to dist/");
