import { Module } from "@nestjs/common";
import { AccessModule } from "./access/access.module.js";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { AuthModule } from "./auth/auth.module.js";
import { AdminModule } from "./admin/admin.module.js";
import { AgenciesModule } from "./agencies/agencies.module.js";
import { NotificationsModule } from "./notifications/notifications.module.js";
import { OnboardingModule } from "./onboarding/onboarding.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { RidesModule } from "./rides/rides.module.js";

@Module({
  imports: [
    PrismaModule,
    AccessModule,
    AuthModule,
    AdminModule,
    AgenciesModule,
    NotificationsModule,
    OnboardingModule,
    RidesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
