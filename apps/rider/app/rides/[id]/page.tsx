import {
  conversationByRide,
  conversationMessages,
  rideDetail,
  sessionSub,
} from "@/lib/api.js";
import { ChatBox } from "./chat-box.js";

export default async function RideDetailPage({
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
        {ride.driver ? ` · ${ride.driver.user.displayName}` : ""}
      </p>
      <section className="mt-8">
        <h2 className="font-semibold">Driver chat</h2>
        {conversation ? (
          <ChatBox
            conversationId={conversation.id}
            closed={conversation.status !== "ACTIVE"}
            initial={initial}
            myId={sub}
          />
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            Chat opens once a driver is assigned.
          </p>
        )}
      </section>
    </main>
  );
}
