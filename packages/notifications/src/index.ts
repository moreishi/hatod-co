/**
 * @hailing/notifications — provider contracts (spec §47: SMS + push + email).
 * Domain code depends on these interfaces only; concrete providers
 * (Semaphore, FCM/APNs, SES/Mailhog) plug in per environment. Never import
 * a concrete provider from a domain module (spec rule 47).
 */
import type { NotificationChannel } from "@hailing/constants";

export interface OutboundMessage {
  channel: NotificationChannel;
  /** Destination: phone number, device token, or email address. */
  to: string;
  template: string;
  variables: Record<string, string | number>;
}

export interface DeliveryReceipt {
  providerMessageId: string;
  deliveredAt: Date;
}

export interface NotificationProvider {
  readonly channel: NotificationChannel;
  send(message: OutboundMessage): Promise<DeliveryReceipt>;
}

/** Tiny {{variable}} renderer shared by all providers. */
export function renderTemplate(
  template: string,
  variables: Record<string, string | number>,
): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) =>
    key in variables ? String(variables[key]) : match,
  );
}

/** Canonical templates — one copy, every channel renders from these. */
export const Templates = {
  OTP_CODE: "Your Hailing code is {{code}}. It expires in 5 minutes.",
  RIDE_ASSIGNED:
    "Driver {{driver}} is on the way to {{pickup}}. Fare {{fare}}.",
  RIDE_COMPLETED:
    "Trip complete. Fare {{fare}} paid via {{method}}. Thank you for riding Hailing!",
  DRIVER_APPROVED:
    "Your driver application was approved. Complete your profile to go online.",
  NEW_MESSAGE: "New message from your {{sender}}.",
} as const;

export type TemplateName = keyof typeof Templates;

export { LogSmsProvider } from "./log-providers.js";
export { LogPushProvider } from "./log-providers.js";
export { LogEmailProvider } from "./log-providers.js";
export { FcmPushProvider } from "./fcm-provider.js";
