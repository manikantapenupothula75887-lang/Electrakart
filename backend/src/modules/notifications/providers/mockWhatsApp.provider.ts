/**
 * ElectraKart Mock WhatsApp Provider
 * In-memory simulator for automated testing and local development.
 * Note: Clearly labeled as simulation; never claims to be a live WhatsApp Business connection.
 */

import { IWhatsAppProvider, WhatsAppSendInput, ProviderSendResult } from '../notification.types.js';

export class MockWhatsAppProvider implements IWhatsAppProvider {
  public readonly name = 'mock';
  private sentMessages: Array<WhatsAppSendInput & { providerMessageId: string; sentAt: Date }> = [];
  private shouldFailNext = false;

  async sendWhatsApp(input: WhatsAppSendInput): Promise<ProviderSendResult> {
    if (this.shouldFailNext) {
      this.shouldFailNext = false;
      return {
        success: false,
        provider: this.name,
        status: 'FAILED',
        error: 'Simulated WhatsApp Cloud API rate limit (HTTP 429)',
      };
    }

    const providerMessageId = `mock-wa-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    this.sentMessages.push({
      ...input,
      providerMessageId,
      sentAt: new Date(),
    });

    return {
      success: true,
      provider: this.name,
      providerMessageId,
      status: 'SENT',
    };
  }

  getSentMessages() {
    return [...this.sentMessages];
  }

  clearSentMessages() {
    this.sentMessages = [];
    this.shouldFailNext = false;
  }

  setFailNext(fail: boolean) {
    this.shouldFailNext = fail;
  }
}

export const mockWhatsAppProvider = new MockWhatsAppProvider();
