export interface AlertDoc {
  type: string;
  status: string;
  expiryDate: string | null;
}

export interface AlertInput {
  drivers: { id: string; name: string; status: string }[];
  docs: { driverId: string; driverName: string; docs: AlertDoc[] }[];
  pendingDocs: number;
  now?: Date;
}

export interface FleetAlert {
  kind: "expiring" | "rejected" | "suspended" | "pending-docs";
  severity: "warn" | "bad";
  text: string;
  driverId?: string;
}

const WINDOW_MS = 30 * 86400_000;

/** Fleet early warnings: expiries, rejections, suspensions, review backlog. */
export function fleetAlerts(input: AlertInput): FleetAlert[] {
  const now = input.now ?? new Date();
  const out: FleetAlert[] = [];
  for (const { driverId, driverName, docs } of input.docs) {
    for (const d of docs) {
      if (d.status === "rejected") {
        out.push({
          kind: "rejected",
          severity: "bad",
          text: `${driverName}: ${d.type} was rejected — re-upload`,
          driverId,
        });
      } else if (d.status === "verified" && d.expiryDate) {
        const ms = new Date(d.expiryDate).getTime() - now.getTime();
        if (ms > 0 && ms < WINDOW_MS) {
          const days = Math.ceil(ms / 86400_000);
          out.push({
            kind: "expiring",
            severity: "warn",
            text: `${driverName}: ${d.type} expires in ${days}d — upload renewal`,
            driverId,
          });
        }
      }
    }
  }
  for (const d of input.drivers) {
    if (d.status === "suspended") {
      out.push({
        kind: "suspended",
        severity: "bad",
        text: `${d.name} is suspended`,
        driverId: d.id,
      });
    }
  }
  if (input.pendingDocs > 0) {
    out.push({
      kind: "pending-docs",
      severity: "warn",
      text: `${input.pendingDocs} document${input.pendingDocs === 1 ? "" : "s"} awaiting review`,
    });
  }
  return out;
}
