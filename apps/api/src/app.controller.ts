import { Controller, Get, Inject } from "@nestjs/common";
import { AppService } from "./app.service.js";

@Controller()
export class AppController {
  constructor(@Inject(AppService) private readonly app: AppService) {}

  @Get("health")
  health() {
    return this.app.health();
  }
}
