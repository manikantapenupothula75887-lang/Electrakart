/**
 * ElectraKart Meta WhatsApp Cloud API Provider Adapter
 * Production adapter for sending WhatsApp Business template messages.
 */

import { IWhatsAppProvider, WhatsAppSendInput, ProviderSendResult } from '../notification.types.js';
import { config } from '../../../config/environment.js';

export class MetaWhatsAppProvider implements IWhatsAppProvider {
  public readonly name = 'meta_whatsapp';

  async sendWhatsApp(input: WhatsAppSendInput): Promise<ProviderSendResult> {
    if (!config.whatsappApiToken || !config.whatsappPhoneNumberId) {
      return {
        success: false,
        provider: this.name,
        status: 'FAILED',
        error: 'WhatsApp Business API token or Phone Number ID is not configured.',
      };
    }

    try {
      const cleanPhone = input.to.replace(/\D/g, '');
      const response = await fetch(
        `https://graph.facebook.com/v19.0/${config.whatsappPhoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.whatsappApiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: cleanPhone,
            type: 'template',
            template: {
              name: input.templateName,
              language: { code: 'en' },
              components: input.templateParams
                ? [
                    {
                      type: 'body',
                      parameters: Object.values(input.templateParams).map((val) => ({
                        type: 'text',
                        text: val,
                      })),
                    },
                  ]
                : undefined,
            },
          }),
        }
      );

      const data: any = await response.json();

      if (!response.ok) {
        return {
          success: false,
          provider: this.name,
          status: 'FAILED',
          error: data.error?.message || `Meta WhatsApp API returned HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        provider: this.name,
        providerMessageId: data.messages?.[0]?.id,
        status: 'SENT',
      };
    } catch (err: any) {
      return {
        success: false,
        provider: this.name,
        status: 'FAILED',
        error: err.message || 'Meta WhatsApp HTTP request failed',
      };
    }
  }
}
