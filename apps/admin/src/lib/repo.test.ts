import { describe, expect, it } from "vitest";
import { deleteQuery, insertQuery, isUniqueViolation, toSqlite, updateQuery } from "./repo";
import { checkBindings } from "./db";
import { validateRiderInput } from "./riders";

describe("insertQuery", () => {
  it("builds parameterized INSERT with allowlisted columns in order", () => {
    const q = insertQuery("riders", ["name", "phone", "status"], {
      name: "R. Garcia",
      phone: "+639171110011",
      status: "active",
    });
    expect(q.text).toBe(
      "INSERT INTO riders (name, phone, status) VALUES ($1, $2, $3) RETURNING *",
    );
    expect(q.values).toEqual(["R. Garcia", "+639171110011", "active"]);
  });

  it("rejects unknown columns (injection safety)", () => {
    expect(() =>
      insertQuery("riders", ["name", "phone"], { name: "x", "phone || '1'--": "y" }),
    ).toThrow(/column/i);
  });

  it("rejects empty rows", () => {
    expect(() => insertQuery("riders", ["name"], {})).toThrow();
  });
});

describe("updateQuery", () => {
  it("builds parameterized UPDATE with id last", () => {
    const q = updateQuery("riders", ["status"], "rdr-001", { status: "suspended" });
    expect(q.text).toBe("UPDATE riders SET status = $1 WHERE id = $2 RETURNING *");
    expect(q.values).toEqual(["suspended", "rdr-001"]);
  });

  it("rejects unknown columns", () => {
    expect(() => updateQuery("riders", ["status"], "rdr-001", { nope: 1 })).toThrow(
      /column/i,
    );
  });
});

describe("deleteQuery", () => {
  it("deletes by id", () => {
    expect(deleteQuery("riders", "rdr-001")).toEqual({
      text: "DELETE FROM riders WHERE id = $1",
      values: ["rdr-001"],
    });
  });
});

describe("toSqlite", () => {
  it("converts $n placeholders to ? in order", () => {
    expect(toSqlite("UPDATE riders SET status = $1 WHERE id = $2")).toBe(
      "UPDATE riders SET status = ? WHERE id = ?",
    );
  });

  it("leaves placeholder-free SQL untouched", () => {
    expect(toSqlite("SELECT 1")).toBe("SELECT 1");
  });
});

describe("isUniqueViolation", () => {
  it("detects Postgres and SQLite unique errors", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
    expect(isUniqueViolation({ code: "SQLITE_CONSTRAINT_UNIQUE" })).toBe(true);
    expect(isUniqueViolation(new Error("UNIQUE constraint failed: riders.phone"))).toBe(true);
  });

  it("ignores other errors", () => {
    expect(isUniqueViolation({ code: "23503" })).toBe(false);
    expect(isUniqueViolation(new Error("no such table"))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });
});

describe("checkBindings (fail loud on placeholder bugs)", () => {
  it("accepts $1..$n each exactly once", () => {
    expect(() => checkBindings("SELECT * FROM t WHERE a = $1 AND b = $2", [1, 2])).not.toThrow();
    expect(() => checkBindings("SELECT 1", [])).not.toThrow();
  });

  it("rejects reused numbers and count mismatches", () => {
    expect(() => checkBindings("SELECT * FROM t WHERE a = $1 OR b = $1", [1])).toThrow(
      /binding mismatch/i,
    );
    expect(() => checkBindings("SELECT * FROM t WHERE a = $1", [1, 2])).toThrow(
      /binding mismatch/i,
    );
    expect(() => checkBindings("SELECT * FROM t WHERE a = $2", [1])).toThrow(
      /binding mismatch/i,
    );
  });
});

describe("validateRiderInput (used by create path)", () => {
  it("trims and accepts valid input", () => {
    expect(validateRiderInput({ name: "  R. Garcia ", phone: "+639171110011" })).toEqual({
      name: "R. Garcia",
      phone: "+639171110011",
      email: null,
    });
  });

  it("rejects empty name or phone", () => {
    expect(() => validateRiderInput({ name: "", phone: "+6391" })).toThrow(/name/i);
    expect(() => validateRiderInput({ name: "R", phone: "  " })).toThrow(/phone/i);
  });
});
