/**
 * ElectraKart Twilio SMS Provider Adapter
 * Production adapter for transactional SMS dispatch via Twilio REST API.
 */

import { ISmsProvider, SmsSendInput, ProviderSendResult } from '../notification.types.js';
import { config } from '../../../config/environment.js';

export class TwilioSmsProvider implements ISmsProvider {
  public readonly name = 'twilio';

  async sendSms(input: SmsSendInput): Promise<ProviderSendResult> {
    if (!config.twilioAccountSid || !config.twilioAuthToken || !config.twilioFromNumber) {
      return {
        success: false,
        provider: this.name,
        status: 'FAILED',
        error: 'Twilio SMS credentials (SID, Auth Token, From Number) are not configured.',
      };
    }

    try {
      const auth = Buffer.from(`${config.twilioAccountSid}:${config.twilioAuthToken}`).toString('base64');
      const params = new URLSearchParams({
        To: input.to,
        From: config.twilioFromNumber,
        Body: input.message,
      });

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${config.twilioAccountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        }
      );

      const data: any = await response.json();

      if (!response.ok) {
        return {
          success: false,
          provider: this.name,
          status: 'FAILED',
          error: data.message || `Twilio returned HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        provider: this.name,
        providerMessageId: data.sid,
        status: 'SENT',
      };
    } catch (err: any) {
      return {
        success: false,
        provider: this.name,
        status: 'FAILED',
        error: err.message || 'Twilio HTTP request failed',
      };
    }
  }
}
