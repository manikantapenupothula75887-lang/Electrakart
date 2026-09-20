/**
 * ElectraKart Notification Provider Factory
 * Resolves active providers for Email, SMS, and WhatsApp based on environment configuration.
 */

import { IEmailProvider, ISmsProvider, IWhatsAppProvider } from '../notification.types.js';
import { mockEmailProvider } from './mockEmail.provider.js';
import { mockSmsProvider } from './mockSms.provider.js';
import { mockWhatsAppProvider } from './mockWhatsApp.provider.js';
import { ResendEmailProvider } from './resendEmail.provider.js';
import { TwilioSmsProvider } from './twilioSms.provider.js';
import { MetaWhatsAppProvider } from './metaWhatsApp.provider.js';
import { config } from '../../../config/environment.js';

export function getEmailProvider(): IEmailProvider {
  if (config.emailProvider === 'resend') {
    return new ResendEmailProvider();
  }
  return mockEmailProvider;
}

export function getSmsProvider(): ISmsProvider {
  if (config.smsProvider === 'twilio') {
    return new TwilioSmsProvider();
  }
  return mockSmsProvider;
}

export function getWhatsAppProvider(): IWhatsAppProvider {
  if (config.whatsappProvider === 'meta_whatsapp') {
    return new MetaWhatsAppProvider();
  }
  return mockWhatsAppProvider;
}
