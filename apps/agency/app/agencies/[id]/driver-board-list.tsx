"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge.js";
import { Input } from "@/components/ui/input.js";
import type { DriverDto } from "@/lib/api.js";
import { humanStatus } from "@/lib/status.js";
import { DriverReviewActions } from "./driver-review-actions.js";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  SUSPENDED: "bg-red-50 text-red-700",
  APPLICANT: "bg-slate-100 text-slate-600",
  DOCUMENTS_PENDING: "bg-amber-50 text-amber-800",
  DOCUMENTS_UNDER_REVIEW: "bg-amber-50 text-amber-800",
};

export function DriverBoardList({ drivers }: { drivers: DriverDto[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = q
    ? drivers.filter((d) =>
        [
          d.user.displayName,
          d.user.phone,
          d.status,
          d.assignments[0]?.vehicle.plateNo ?? "",
          d.assignments[0]?.vehicle.type ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
    : drivers;
  return (
    <>
      <div className="mt-6">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, phone, plate, or status…"
        />
      </div>
      <ul className="mt-3 divide-y">
        {filtered.map((driver) => (
          <li
            key={driver.id}
            className="flex items-center justify-between gap-4 px-6 py-4"
          >
            <div>
              <p className="font-medium">
                <Link href={`./drivers/${driver.id}`}>
                  {driver.user.displayName}
                </Link>
              </p>
              <p className="font-mono text-xs text-slate-500">
                {driver.user.phone}
              </p>
              <p className="text-xs text-slate-500">
                {driver.assignments[0]
                  ? `${driver.assignments[0].vehicle.plateNo} · ${driver.assignments[0].vehicle.type}`
                  : "no vehicle assigned"}
              </p>
              {driver.documents.length > 0 && driver.status !== "ACTIVE" && (
                <p className="mt-1 text-xs font-medium text-amber-800">
                  {
                    driver.documents.filter((d) => d.status === "VERIFIED")
                      .length
                  }{" "}
                  of {driver.documents.length} documents verified
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge
                className={
                  STATUS_STYLES[driver.status] ?? "bg-slate-100 text-slate-600"
                }
              >
                <span title={driver.status}>{humanStatus(driver.status)}</span>
              </Badge>
              <DriverReviewActions
                driverId={driver.id}
                status={driver.status}
              />
            </div>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-6 py-8 text-center text-sm text-slate-500">
            {drivers.length === 0
              ? "No drivers yet — they appear here after applying."
              : `No drivers match “${query.trim()}”. Clear the search to see everyone.`}
          </li>
        )}
      </ul>
    </>
  );
}
