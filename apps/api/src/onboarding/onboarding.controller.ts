import { Body, Controller, Param, Post, Req, UseGuards } from "@nestjs/common";
import type { DocumentStatus } from "@hailing/constants";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { OnboardingService } from "./onboarding.service.js";
import type {
  ApplyDriverDto,
  ReviewAction,
  SubmitDocumentDto,
} from "./onboarding.service.js";

interface AuthedRequest {
  headers: Record<string, string>;
  user?: { sub: string; roles: string[] };
}

function requesterOf(req: AuthedRequest) {
  return { sub: req.user!.sub, roles: req.user!.roles ?? [] };
}

@UseGuards(RolesGuard)
@Controller("onboarding")
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Post("drivers/apply")
  @Roles("RIDER")
  apply(@Req() req: AuthedRequest, @Body() dto: ApplyDriverDto) {
    return this.onboarding.applyDriver(req.user!.sub, dto);
  }

  @Post("drivers/:id/documents")
  @Roles("RIDER", "DRIVER:*", "AGENCY:*")
  submitDocument(
    @Req() req: AuthedRequest,
    @Param("id") id: string,
    @Body() dto: SubmitDocumentDto,
  ) {
    return this.onboarding.submitDocument(id, dto, requesterOf(req));
  }

  @Post("documents/:id/verify")
  @Roles("AGENCY:*", "ADMIN:OPS", "ADMIN:SUPER_ADMIN")
  verifyDocument(
    @Req() req: AuthedRequest,
    @Param("id") id: string,
    @Body() body: { status: DocumentStatus },
  ) {
    return this.onboarding.verifyDocument(id, body.status, req.user!.sub);
  }

  @Post("drivers/:id/review")
  @Roles("AGENCY:*", "ADMIN:OPS", "ADMIN:SUPER_ADMIN")
  review(
    @Req() req: AuthedRequest,
    @Param("id") id: string,
    @Body() body: { action: ReviewAction },
  ) {
    return this.onboarding.reviewDriver(id, body.action, req.user!.sub);
  }
}
