import { PrismaClient } from "@prisma/client";

const which = process.argv[2] ?? "env";
const p =
  which === "rel"
    ? new PrismaClient({ datasourceUrl: "file:../api/prisma/dev.db" })
    : new PrismaClient();
const count = await p.notification.count().catch((e: Error) => `FAIL ${String(e).split("\n")[0]}`);
console.log(`${which}=${count}`);
await p.$disconnect();
