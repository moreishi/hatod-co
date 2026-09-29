import { Module } from "@nestjs/common";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { AuthModule } from "./auth/auth.module.js";
import { AdminModule } from "./admin/admin.module.js";
import { AgenciesModule } from "./agencies/agencies.module.js";
import { OnboardingModule } from "./onboarding/onboarding.module.js";
import { RidesModule } from "./rides/rides.module.js";

@Module({
  imports: [
    AuthModule,
    AdminModule,
    AgenciesModule,
    OnboardingModule,
    RidesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
