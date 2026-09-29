import {
  conversationByRide,
  conversationMessages,
  rideDetail,
  sessionSub,
} from "@/lib/api.js";
import { ChatBox } from "./chat-box.js";
import { RideActions } from "./ride-actions.js";

const NEXT: Record<string, string[]> = {
  ASSIGNED: ["DRIVER_EN_ROUTE"],
  DRIVER_EN_ROUTE: ["DRIVER_ARRIVED"],
  DRIVER_ARRIVED: ["IN_PROGRESS"],
  IN_PROGRESS: ["COMPLETED"],
};

export default async function DriverRidePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [ride, sub] = await Promise.all([rideDetail(id), sessionSub()]);
  const conversation = await conversationByRide(id);
  const initial = conversation
    ? await conversationMessages(conversation.id)
    : [];
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-bold">
        {ride.pickupLabel} → {ride.dropoffLabel}
      </h1>
      <p className="mt-1 font-mono text-sm text-slate-500">
        {ride.status} · ₱{(ride.fareCentavos / 100).toFixed(2)}
        {ride.acceptedAt ? " · accepted" : " · awaiting your accept"}
      </p>
      <RideActions
        rideId={id}
        status={ride.status}
        accepted={ride.acceptedAt !== null}
        next={NEXT[ride.status] ?? []}
      />
      <section className="mt-8">
        <h2 className="font-semibold">Rider chat</h2>
        {conversation ? (
          <ChatBox
            conversationId={conversation.id}
            closed={conversation.status !== "ACTIVE"}
            initial={initial}
            myId={sub}
          />
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            Chat opens after assignment.
          </p>
        )}
      </section>
    </main>
  );
}
