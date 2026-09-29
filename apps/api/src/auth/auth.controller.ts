import { Body, Controller, Post } from "@nestjs/common";
import { AuthService } from "./auth.service.js";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("otp/request")
  requestOtp(@Body() body: { phone: string }) {
    return this.auth.requestOtp(body.phone);
  }

  @Post("otp/verify")
  verifyOtp(@Body() body: { challengeId: string; code: string }) {
    return this.auth.verifyOtp(body.challengeId, body.code);
  }

  @Post("password")
  password(@Body() body: { phone: string; password: string }) {
    return this.auth.checkPassword(body.phone, body.password);
  }
}
