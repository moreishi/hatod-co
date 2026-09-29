"use client";

import { useMemo, useState } from "react";
import { COUNTRIES, PROVINCES, citiesOf, defaultCityFor } from "@/lib/geoPh";
import { Field, inputCls } from "../ui";

export function LocationFields() {
  const [province, setProvince] = useState("South Cotabato");
  const [city, setCity] = useState(() => defaultCityFor("South Cotabato"));
  const local = useMemo(() => citiesOf(province), [province]);

  function onProvince(next: string) {
    setProvince(next);
    // Coincide: the city follows the province.
    setCity(defaultCityFor(next));
  }

  return (
    <>
      <Field label="Country">
        <select name="country" defaultValue="Philippines" className={inputCls}>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Province">
          <select
            name="province"
            value={province}
            onChange={(e) => onProvince(e.target.value)}
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
          <select
            name="city"
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={inputCls}
          >
            {local.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <p className="-mt-1 text-xs text-zinc-500">
        City choices follow the selected province — {local.length} listed for {province}.
      </p>
    </>
  );
}
