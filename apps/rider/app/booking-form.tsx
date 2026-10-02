"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { VehicleType } from "@hailing/constants";
import { Button } from "@/components/ui/button.js";

export function BookingForm() {
  const router = useRouter();
  const [pickup, setPickup] = useState("Ayala Center Cebu");
  const [dropoff, setDropoff] = useState("SM City Cebu");
  const [vehicleType, setVehicleType] = useState<string>(VehicleType.SEDAN);
  const [quote, setQuote] = useState<{
    fareCentavos: number;
    distanceKm: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Fixed pilot landmarks keep booking usable without a map picker.
  // Coordinates flow to /api/rides/quote for a real haversine fare.
  const LANDMARKS: Record<string, { lat: number; lng: number }> = {
    "Ayala Center Cebu": { lat: 10.3181, lng: 123.9054 },
    "SM City Cebu": { lat: 10.3111, lng: 123.9185 },
    "Mactan Airport": { lat: 10.3075, lng: 123.9795 },
    "IT Park": { lat: 10.3297, lng: 123.9058 },
  };

  async function getQuote() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/rides/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          origin: LANDMARKS[pickup] ?? { lat: 10.3157, lng: 123.8854 },
          destination: LANDMARKS[dropoff] ?? { lat: 10.3157, lng: 123.8854 },
          vehicleType,
        }),
      });
      const body = (await res.json()) as {
        fareCentavos?: number;
        distanceKm?: number;
        message?: string;
      };
      if (!res.ok) throw new Error(body.message ?? "quote failed");
      setQuote({
        fareCentavos: body.fareCentavos!,
        distanceKm: body.distanceKm!,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "quote failed");
    } finally {
      setBusy(false);
    }
  }

  async function requestRide() {
    setBusy(true);
    setError(null);
    try {
      const origin = LANDMARKS[pickup] ?? { lat: 10.3157, lng: 123.8854 };
      const res = await fetch("/api/rides/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          pickupLabel: pickup,
          pickupBrgyCode: "072217001",
          pickupLat: origin.lat,
          pickupLng: origin.lng,
          dropoffLabel: dropoff,
          dropoffBrgyCode: "072217002",
          distanceKm: quote?.distanceKm ?? 5,
          vehicleType,
          paymentMethod: "CASH",
        }),
      });
      const body = (await res.json()) as { id?: string; message?: string };
      if (!res.ok || !body.id)
        throw new Error(body.message ?? "request failed");
      router.push(`/rides/${body.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "request failed");
    } finally {
      setBusy(false);
    }
  }

  const input =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none";
  const names = Object.keys(LANDMARKS);

  return (
    <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <label className="text-sm font-medium">
        Pickup
        <select
          className={input}
          value={pickup}
          onChange={(e) => setPickup(e.target.value)}
        >
          {names.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>
      <label className="mt-3 block text-sm font-medium">
        Dropoff
        <select
          className={input}
          value={dropoff}
          onChange={(e) => setDropoff(e.target.value)}
        >
          {names.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>
      <label className="mt-3 block text-sm font-medium">
        Vehicle
        <select
          className={input}
          value={vehicleType}
          onChange={(e) => setVehicleType(e.target.value)}
        >
          {Object.values(VehicleType).map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      {quote && (
        <p className="mt-4 rounded-lg bg-brand-50 px-4 py-3 text-brand-900">
          ₱{(quote.fareCentavos / 100).toFixed(2)} ·{" "}
          {quote.distanceKm.toFixed(1)} km
        </p>
      )}
      <div className="mt-4 flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={getQuote}
          disabled={busy}
        >
          Get fare
        </Button>
        <Button
          className="flex-1"
          onClick={requestRide}
          disabled={busy || !quote}
        >
          Book ride
        </Button>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
