import { describe, expect, it } from "vitest";
import { deleteQuery, insertQuery, toSqlite, updateQuery } from "./repo";
import { validateRider } from "./riders";

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

describe("validateRider", () => {
  it("trims and accepts valid input", () => {
    expect(validateRider({ name: "  R. Garcia ", phone: "+639171110011" })).toEqual({
      name: "R. Garcia",
      phone: "+639171110011",
    });
  });

  it("rejects empty name or phone", () => {
    expect(() => validateRider({ name: "", phone: "+6391" })).toThrow(/name/i);
    expect(() => validateRider({ name: "R", phone: "  " })).toThrow(/phone/i);
  });
});
