import { describe, expect, it } from "vitest";
import { filterByRole, filterUsers, getUserById, paginate } from "./users";

const rows = [
  { userId: "u1", name: "Sam Ops", email: "ops@hatod.co", phone: "+639170000011", balanceCents: 0 },
  { userId: "u2", name: "Ria Rider", email: "rider@hatod.co", phone: "+639171110011", balanceCents: 500 },
];

describe("filterUsers (wallet search)", () => {
  it("matches name, email, and unique phone", () => {
    expect(filterUsers(rows as never, "ria").map((r) => r.userId)).toEqual(["u2"]);
    expect(filterUsers(rows as never, "09171110011").map((r) => r.userId)).toEqual(["u2"]);
    expect(filterUsers(rows as never, "ops@hatod").map((r) => r.userId)).toEqual(["u1"]);
    expect(filterUsers(rows as never, "  ").length).toBe(2);
  });
});

describe("paginate", () => {
  it("computes offset, pages, and clamps", () => {
    expect(paginate(95, 1, 10)).toEqual({ page: 1, pages: 10, offset: 0, limit: 10 });
    expect(paginate(95, 10, 10)).toEqual({ page: 10, pages: 10, offset: 90, limit: 10 });
    expect(paginate(95, 99, 10).page).toBe(10);
    expect(paginate(95, 0, 10).page).toBe(1);
    expect(paginate(0, 1, 10)).toEqual({ page: 1, pages: 1, offset: 0, limit: 10 });
  });
});

describe("filterByRole", () => {
  const rows = [
    { roles: ["superadmin"] },
    { roles: ["driver"] },
    { roles: ["driver", "rider"] },
  ];
  it("keeps matching role sets, empty role keeps all", () => {
    expect(filterByRole(rows as never, "driver").length).toBe(2);
    expect(filterByRole(rows as never, "rider").length).toBe(1);
    expect(filterByRole(rows as never, "").length).toBe(3);
  });
});

describe("getUserById", () => {
  it("returns the full profile with roles, null when missing", async () => {
    const u = await getUserById("usr-admin");
    expect(u?.email).toBe("admin@hatod.co");
    expect(u?.roles).toContain("superadmin");
    expect(await getUserById("nope")).toBeNull();
  });
});
