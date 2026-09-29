import { Injectable } from "@nestjs/common";
import { RideStatus, RideTransitions } from "@hailing/constants";

/**
 * Backend enforcement of the ride state machine (spec §31, rules 33-35).
 * Clients cannot bypass transitions — every change passes through here.
 */
@Injectable()
export class RideTransitionGuard {
  canTransition(from: RideStatus, to: RideStatus): boolean {
    return RideTransitions[from].includes(to);
  }

  assertTransition(from: RideStatus, to: RideStatus): void {
    if (!this.canTransition(from, to)) {
      throw new Error(`Illegal ride transition: ${from} -> ${to}`);
    }
  }
}
