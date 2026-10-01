import { Inject, Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service.js";
import { Roles, Public } from "./roles.decorator.js";
import { RolesGuard } from "./roles.guard.js";

interface AuthedRequest {
  user?: { sub: string; jti?: string };
}

@UseGuards(RolesGuard)
@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Public()
  @Post("otp/request")
  requestOtp(@Body() body: { phone: string }) {
    return this.auth.requestOtp(body.phone);
  }

  @Public()
  @Post("otp/verify")
  verifyOtp(@Body() body: { challengeId: string; code: string }) {
    return this.auth.verifyOtp(body.challengeId, body.code);
  }

  @Public()
  @Post("password")
  password(@Body() body: { phone: string; password: string }) {
    return this.auth.checkPassword(body.phone, body.password);
  }

  /** Logout: revoke the caller's server-side session. */
  @Post("logout")
  @Roles("RIDER")
  logout(@Req() req: AuthedRequest) {
    return this.auth.logout(req.user!.sub, req.user?.jti);
  }
}
