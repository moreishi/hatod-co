"use client";

import { useState } from "react";
import { COUNTRIES, PROVINCES, citiesOf } from "@/lib/geoPh";
import { Field, inputCls } from "../ui";

export function LocationFields() {
  const [province, setProvince] = useState("South Cotabato");
  const cities = citiesOf(province);
  return (
    <>
      <Field label="Country">
        <input
          name="country"
          defaultValue="Philippines"
          list="country-list"
          className={inputCls}
        />
        <datalist id="country-list">
          {COUNTRIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Province">
          <select
            name="province"
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            className={inputCls}
          >
            {PROVINCES.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name} · {p.region}
              </option>
            ))}
          </select>
        </Field>
        <Field label="City / municipality">
          <input
            name="city"
            required
            placeholder="General Santos"
            list="city-list"
            className={inputCls}
          />
          <datalist id="city-list">
            {cities.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
      </div>
    </>
  );
}
