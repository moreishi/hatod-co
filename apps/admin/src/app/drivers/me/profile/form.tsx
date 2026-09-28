"use client";

import type { Driver } from "@/lib/types";
import { Btn, Card, Field, PageHeader, inputCls } from "../../../ui";
import { updateMyProfileAction } from "../actions";

export function ProfileForm({ profile }: { profile: Driver }) {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="My profile" />
      <Card>
        <form action={updateMyProfileAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Name">
            <input name="name" required defaultValue={profile.name} className={inputCls} />
          </Field>
          <Field label="Phone">
            <input name="phone" required defaultValue={profile.phone} className={inputCls} />
          </Field>
          <Field label="Vehicle">
            <select name="vehicleType" defaultValue={profile.vehicleType} className={inputCls}>
              {["moto", "trike", "sedan", "suv"].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Plate no">
            <input name="plateNo" required defaultValue={profile.plateNo} className={inputCls} />
          </Field>
          <div className="sm:col-span-2">
            <Btn tone="primary" type="submit">
              Save profile
            </Btn>
          </div>
          <p className="-mt-1 text-xs text-zinc-500 sm:col-span-2">
            Documents stay agency-managed to preserve verification.
          </p>
        </form>
      </Card>
    </div>
  );
}
