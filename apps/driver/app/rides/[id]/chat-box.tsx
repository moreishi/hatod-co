"use client";

import { useEffect, useState } from "react";

interface Message {
  id: string;
  senderId: string;
  type: string;
  content: string;
  status: string;
}

export function ChatBox({
  conversationId,
  closed,
  initial,
  myId,
}: {
  conversationId: string;
  closed: boolean;
  initial: Message[];
  myId: string;
}) {
  const [messages, setMessages] = useState(initial);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch(`/api/chat?conversationId=${conversationId}`);
    if (res.ok) setMessages((await res.json()) as Message[]);
  }

  useEffect(() => {
    if (closed) return;
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closed]);

  async function send() {
    if (!draft.trim()) return;
    setError(null);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        conversationId,
        content: draft,
        clientMessageId: `${Date.now()}`,
      }),
    });
    if (!res.ok) {
      const body = (await res.json()) as { message?: string };
      setError(body.message ?? "send failed");
      return;
    }
    setDraft("");
    await refresh();
  }

  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
      <ul className="max-h-80 space-y-2 overflow-y-auto">
        {messages.map((m) => (
          <li
            key={m.id}
            className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
              m.senderId === myId
                ? "ml-auto bg-brand-700 text-white"
                : m.type === "SYSTEM"
                  ? "mx-auto bg-slate-100 text-center text-slate-500"
                  : "bg-slate-100"
            }`}
          >
            {m.content}
          </li>
        ))}
        {messages.length === 0 && (
          <li className="text-sm text-slate-400">No messages yet.</li>
        )}
      </ul>
      {!closed ? (
        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message your rider."
            maxLength={1000}
          />
          <button
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm text-white disabled:opacity-50"
            onClick={send}
            disabled={!draft.trim()}
          >
            Send
          </button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500">
          This conversation is closed.
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
