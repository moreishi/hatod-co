import type { APIRequestContext } from "@playwright/test";

export const API = `http://localhost:${process.env.E2E_API_PORT ?? 3101}`;

/** Phone OTP login → bearer token (dev codes are returned by the API). */
export async function login(
  request: APIRequestContext,
  phone: string,
): Promise<string> {
  const challenge = await request.post(`${API}/api/auth/otp/request`, {
    data: { phone },
  });
  if (!challenge.ok()) throw new Error(`otp request failed for ${phone}`);
  const { challengeId, devCode } = await challenge.json();
  const verify = await request.post(`${API}/api/auth/otp/verify`, {
    data: { challengeId, code: devCode },
  });
  if (!verify.ok()) throw new Error(`otp verify failed for ${phone}`);
  const { token } = await verify.json();
  return token as string;
}

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
