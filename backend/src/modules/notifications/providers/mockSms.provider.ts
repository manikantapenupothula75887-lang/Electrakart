/**
 * ElectraKart Mock SMS Provider
 * In-memory simulator for automated testing and local development.
 */

import { ISmsProvider, SmsSendInput, ProviderSendResult } from '../notification.types.js';

export class MockSmsProvider implements ISmsProvider {
  public readonly name = 'mock';
  private sentMessages: Array<SmsSendInput & { providerMessageId: string; sentAt: Date }> = [];
  private shouldFailNext = false;

  async sendSms(input: SmsSendInput): Promise<ProviderSendResult> {
    if (this.shouldFailNext) {
      this.shouldFailNext = false;
      return {
        success: false,
        provider: this.name,
        status: 'FAILED',
        error: 'Simulated telecom gateway carrier rejection (ERR_ROUTE_FAILED)',
      };
    }

    const providerMessageId = `mock-sms-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
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

export const mockSmsProvider = new MockSmsProvider();
