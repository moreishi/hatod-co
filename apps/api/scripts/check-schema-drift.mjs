// Fails when prisma/schema.prisma (SQLite) and prisma/postgres/schema.prisma
// define different models or fields. Run in CI; run locally after any schema edit.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "prisma");

function parse(path) {
  const text = readFileSync(path, "utf8");
  const models = new Map();
  let current = null;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const model = line.match(/^model (\w+) \{$/);
    if (model) {
      current = model[1];
      models.set(current, new Set());
      continue;
    }
    if (line === "}") {
      current = null;
      continue;
    }
    if (current) {
      const field = line.match(/^(\w+)\s/);
      if (field && !line.startsWith("@@")) models.get(current).add(field[1]);
    }
  }
  return models;
}

const sqlite = parse(join(dir, "schema.prisma"));
const postgres = parse(join(dir, "postgres", "schema.prisma"));
let drift = 0;
for (const [name, fields] of sqlite) {
  if (!postgres.has(name)) {
    console.error(`missing model in postgres schema: ${name}`);
    drift += 1;
    continue;
  }
  for (const field of fields) {
    if (!postgres.get(name).has(field)) {
      console.error(`missing field in postgres ${name}: ${field}`);
      drift += 1;
    }
  }
}
for (const name of postgres.keys()) {
  if (!sqlite.has(name)) {
    console.error(`missing model in sqlite schema: ${name}`);
    drift += 1;
  }
}
if (drift > 0) {
  console.error(`schema drift: ${drift} problem(s)`);
  process.exit(1);
}
console.log("schemas in sync");
