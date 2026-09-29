import { describe, expect, it } from "vitest";
import { AdminController } from "../src/admin/admin.controller.js";
import { AdminService } from "../src/admin/admin.service.js";
import { AgenciesController } from "../src/agencies/agencies.controller.js";
import { AgenciesService } from "../src/agencies/agencies.service.js";
import { AppController } from "../src/app.controller.js";
import { AuthController } from "../src/auth/auth.controller.js";
import { AuthService } from "../src/auth/auth.service.js";
import { RolesGuard } from "../src/auth/roles.guard.js";
import { MessagingController } from "../src/messaging/messaging.controller.js";
import { MessagingService } from "../src/messaging/messaging.service.js";
import { NotificationsController } from "../src/notifications/notifications.controller.js";
import { NotificationsService } from "../src/notifications/notifications.service.js";
import { OnboardingController } from "../src/onboarding/onboarding.controller.js";
import { OnboardingService } from "../src/onboarding/onboarding.service.js";
import { RideEventsGateway } from "../src/realtime/ride-events.gateway.js";
import { RidesController } from "../src/rides/rides.controller.js";
import { RidesService } from "../src/rides/rides.service.js";

/**
 * tsx/esbuild do not emit design:paramtypes, so Nest instantiates undecorated
 * constructors with zero args (every route 500s). Every injectable MUST use
 * explicit @Inject() tokens. This test fails the build if one is missed.
 */
const INJECTABLES: Record<string, new (...args: never[]) => unknown> = {
  AdminController,
  AdminService,
  AgenciesController,
  AgenciesService,
  AppController,
  AuthController,
  AuthService,
  RolesGuard,
  MessagingController,
  MessagingService,
  NotificationsController,
  NotificationsService,
  OnboardingController,
  OnboardingService,
  RideEventsGateway,
  RidesController,
  RidesService,
};

describe("explicit @Inject() tokens (tsx-safe DI)", () => {
  for (const [name, cls] of Object.entries(INJECTABLES)) {
    it(`${name} declares tokens for all ${cls.length} constructor params`, () => {
      if (cls.length === 0) return;
      const declared: unknown[] =
        Reflect.getMetadata("self:paramtypes", cls) ?? [];
      expect(declared.length).toBe(cls.length);
    });
  }
});
