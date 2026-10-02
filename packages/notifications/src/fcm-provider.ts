import admin from "firebase-admin";
import {
  renderTemplate,
  Templates,
  type DeliveryReceipt,
  type NotificationProvider,
  type OutboundMessage,
} from "./index.js";

/**
 * FCM push via firebase-admin. The send function is injectable so unit
 * tests never touch Firebase; production passes nothing and uses the
 * default app (GOOGLE_APPLICATION_CREDENTIALS).
 */
export class FcmPushProvider implements NotificationProvider {
  readonly channel = "PUSH" as const;

  constructor(
    private readonly appName = "HATOD",
    private readonly sendOne: (
      token: string,
      title: string,
      body: string,
      data: Record<string, string>,
    ) => Promise<string> = (token, title, body, data) =>
      admin.messaging().send({ token, notification: { title, body }, data }),
  ) {}

  async send(message: OutboundMessage): Promise<DeliveryReceipt> {
    if (message.channel !== "PUSH") {
      throw new Error(`channel mismatch: ${message.channel} via PUSH`);
    }
    const template =
      (Templates as Record<string, string>)[message.template] ??
      message.template;
    const body = renderTemplate(template, message.variables);
    const data: Record<string, string> = { template: message.template };
    for (const [key, value] of Object.entries(message.variables)) {
      data[`var_${key}`] = String(value);
    }
    const providerMessageId = await this.sendOne(
      message.to,
      this.appName,
      body,
      data,
    );
    return { providerMessageId, deliveredAt: new Date() };
  }
}
