import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service.js";

/** Single shared Prisma client for every module (avoids duplicate pools). */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
