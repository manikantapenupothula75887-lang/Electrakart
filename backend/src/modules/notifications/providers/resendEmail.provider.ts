/**
 * ElectraKart Resend Email Provider Adapter
 * Production adapter for sending transactional emails via Resend API.
 */

import { IEmailProvider, EmailSendInput, ProviderSendResult } from '../notification.types.js';
import { config } from '../../../config/environment.js';

export class ResendEmailProvider implements IEmailProvider {
  public readonly name = 'resend';

  async sendEmail(input: EmailSendInput): Promise<ProviderSendResult> {
    if (!config.resendApiKey) {
      return {
        success: false,
        provider: this.name,
        status: 'FAILED',
        error: 'Resend API key is not configured.',
      };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: config.emailFrom,
          to: [input.to],
          subject: input.subject,
          html: input.htmlBody,
          text: input.textBody,
        }),
      });

      const data: any = await response.json();

      if (!response.ok) {
        return {
          success: false,
          provider: this.name,
          status: 'FAILED',
          error: data.message || `Resend API returned HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        provider: this.name,
        providerMessageId: data.id,
        status: 'SENT',
      };
    } catch (err: any) {
      return {
        success: false,
        provider: this.name,
        status: 'FAILED',
        error: err.message || 'Resend HTTP request failed',
      };
    }
  }
}
