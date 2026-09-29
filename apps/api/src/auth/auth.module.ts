import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { PrismaService } from "./prisma.service.js";
import { RolesGuard } from "./roles.guard.js";
import { TokenService } from "./token.service.js";

@Module({
  controllers: [AuthController],
  providers: [AuthService, PrismaService, TokenService, RolesGuard],
  exports: [TokenService, RolesGuard, PrismaService],
})
export class AuthModule {}
