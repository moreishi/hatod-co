import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  health() {
    return { status: "ok", service: "hailing-api", version: "0.1.0" };
  }
}
