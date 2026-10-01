import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix("api");
  // Inline document photos (base64 data URLs) run a few hundred KB;
  // the Express default 100kb cap would 413 every real submission.
  app.useBodyParser("json", { limit: "2mb" });
  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`hailing api listening on :${port}/api`);
}

void bootstrap();
