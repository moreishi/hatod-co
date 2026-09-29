import type { NotificationChannel } from "@hailing/constants";
import {
  renderTemplate,
  type DeliveryReceipt,
  type NotificationProvider,
  type OutboundMessage,
} from "./index.js";

export interface LoggedDelivery extends OutboundMessage {
  rendered: string;
  providerMessageId: string;
}

/**
 * LocalStage providers: render + record instead of sending (spec §54).
 * Tests and the worker assert against `deliveries`.
 */
class LogProvider implements NotificationProvider {
  readonly channel: NotificationChannel;
  readonly deliveries: LoggedDelivery[] = [];
  private seq = 0;

  constructor(channel: NotificationChannel) {
    this.channel = channel;
  }

  async send(message: OutboundMessage): Promise<DeliveryReceipt> {
    if (message.channel !== this.channel) {
      throw new Error(
        `channel mismatch: ${message.channel} via ${this.channel}`,
      );
    }
    const rendered = renderTemplate(message.template, message.variables);
    this.seq += 1;
    const receipt = {
      providerMessageId: `log-${this.seq}`,
      deliveredAt: new Date(),
    };
    this.deliveries.push({
      ...message,
      rendered,
      providerMessageId: receipt.providerMessageId,
    });
    return receipt;
  }
}

export class LogSmsProvider extends LogProvider {
  constructor() {
    super("SMS");
  }
}

export class LogPushProvider extends LogProvider {
  constructor() {
    super("PUSH");
  }
}

export class LogEmailProvider extends LogProvider {
  constructor() {
    super("EMAIL");
  }
}
