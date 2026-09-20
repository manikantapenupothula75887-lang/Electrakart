/**
 * ElectraKart Mock Email Provider
 * In-memory simulator for automated testing and local development.
 */

import { IEmailProvider, EmailSendInput, ProviderSendResult } from '../notification.types.js';

export class MockEmailProvider implements IEmailProvider {
  public readonly name = 'mock';
  private sentEmails: Array<EmailSendInput & { providerMessageId: string; sentAt: Date }> = [];
  private shouldFailNext = false;

  async sendEmail(input: EmailSendInput): Promise<ProviderSendResult> {
    if (this.shouldFailNext) {
      this.shouldFailNext = false;
      return {
        success: false,
        provider: this.name,
        status: 'FAILED',
        error: 'Simulated email provider network timeout (SMTP 504)',
      };
    }

    const providerMessageId = `mock-email-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    this.sentEmails.push({
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

  getSentEmails() {
    return [...this.sentEmails];
  }

  clearSentEmails() {
    this.sentEmails = [];
    this.shouldFailNext = false;
  }

  setFailNext(fail: boolean) {
    this.shouldFailNext = fail;
  }
}

export const mockEmailProvider = new MockEmailProvider();
