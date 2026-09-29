"use client";

import { useMemo, useState } from "react";
import { COUNTRIES, PROVINCES, citiesOf, resolveProvince } from "@/lib/geoPh";
import { Field, inputCls } from "../ui";

export function LocationFields() {
  const [province, setProvince] = useState("South Cotabato");
  const [city, setCity] = useState("");
  const local = useMemo(() => citiesOf(province), [province]);
  const allCities = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    // Province cities first, then the rest of the country.
    for (const c of local) {
      if (!seen.has(c)) {
        seen.add(c);
        out.push(c);
      }
    }
    for (const p of PROVINCES) {
      for (const c of citiesOf(p.name)) {
        if (!seen.has(c)) {
          seen.add(c);
          out.push(c);
        }
      }
    }
    return out;
  }, [local]);

  function onProvince(next: string) {
    setProvince(next);
    // Coincide: drop the city when it doesn't belong to the new province.
    if (city && !citiesOf(next).some((c) => c.toLowerCase() === city.trim().toLowerCase())) {
      setCity("");
    }
  }

  function onCity(next: string) {
    setCity(next);
    // Coincide: a known city pulls its province along.
    const owner = resolveProvince(next, province);
    if (owner && owner !== province) setProvince(owner);
  }

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
          <input
            name="city"
            required
            value={city}
            onChange={(e) => onCity(e.target.value)}
            placeholder="General Santos"
            list="city-list"
            className={inputCls}
          />
          <datalist id="city-list">
            {allCities.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
      </div>
      <p className="-mt-1 text-xs text-zinc-500">
        Picking a listed city sets its province automatically; changing province clears a
        non-local city. Unlisted municipalities can still be typed.
      </p>
    </>
  );
}
