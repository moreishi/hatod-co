import { Global, Module } from "@nestjs/common";
import { RolesGuard } from "../auth/roles.guard.js";
import { TokenService } from "../auth/token.service.js";

/** Token verification + RBAC guard, shared by every module. */
@Global()
@Module({
  providers: [TokenService, RolesGuard],
  exports: [TokenService, RolesGuard],
})
export class AccessModule {}
