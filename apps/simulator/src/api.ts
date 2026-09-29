/** Thin HTTP client over the real Hailing API (no mocks, no direct DB). */
export class SimApi {
  constructor(private readonly base: string) {}

  private async call<T>(
    path: string,
    token: string | null,
    init?: RequestInit,
  ): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        message?: string;
      } | null;
      throw new Error(`API ${res.status} ${path}: ${body?.message ?? "error"}`);
    }
    return res.json() as Promise<T>;
  }

  async login(phone: string): Promise<string> {
    const challenge = (await this.call<{
      challengeId: string;
      devCode?: string;
    }>("/api/auth/otp/request", null, {
      method: "POST",
      body: JSON.stringify({ phone }),
    })) as { challengeId: string; devCode?: string };
    if (!challenge.devCode) throw new Error("no dev code (production?)");
    const verified = await this.call<{ token: string }>(
      "/api/auth/otp/verify",
      null,
      {
        method: "POST",
        body: JSON.stringify({
          challengeId: challenge.challengeId,
          code: challenge.devCode,
        }),
      },
    );
    return verified.token;
  }

  requestRide(token: string, dto: object) {
    return this.call<{ id: string; status: string }>("/api/rides", token, {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }

  assignRide(token: string, rideId: string, driverId: string) {
    return this.call(`/api/rides/${rideId}/assign`, token, {
      method: "POST",
      body: JSON.stringify({ driverId }),
    });
  }

  acceptRide(token: string, rideId: string) {
    return this.call(`/api/rides/${rideId}/accept`, token, { method: "POST" });
  }

  rejectRide(token: string, rideId: string) {
    return this.call(`/api/rides/${rideId}/reject`, token, { method: "POST" });
  }

  transitionRide(
    token: string,
    rideId: string,
    to: string,
    cancelReason?: string,
  ) {
    return this.call(`/api/rides/${rideId}/transition`, token, {
      method: "POST",
      body: JSON.stringify({ to, cancelReason }),
    });
  }

  setOnline(token: string, online: boolean) {
    return this.call("/api/drivers/me/online", token, {
      method: "POST",
      body: JSON.stringify({ online }),
    });
  }

  myConversations(token: string) {
    return this.call<{ id: string; rideId: string; status: string }[]>(
      "/api/conversations/mine",
      token,
    );
  }

  sendMessage(
    token: string,
    conversationId: string,
    content: string,
    clientMessageId: string,
  ) {
    return this.call<{ id: string }>(
      `/api/conversations/${conversationId}/messages`,
      token,
      {
        method: "POST",
        body: JSON.stringify({ content, clientMessageId }),
      },
    );
  }
}
