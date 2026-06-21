import { TelegramDistributor } from './TelegramDistributor.js';
import { WhatsAppDistributor } from './WhatsAppDistributor.js';
import { DistributionManager } from './DistributionManager.js';
import { DealQueue } from './DealQueue.js';

/** מאתחל את כל ערוצי ההפצה לפי משתני סביבה, ומחזיר DistributionManager מוכן לעבודה */
export function initializeDistribution(env = process.env) {
  const telegram = new TelegramDistributor({
    botToken: env.TELEGRAM_BOT_TOKEN,
    channels: {
      he: env.TELEGRAM_CHANNEL_HE,
      en: env.TELEGRAM_CHANNEL_EN,
      es: env.TELEGRAM_CHANNEL_ES,
      default: env.TELEGRAM_CHANNEL_DEFAULT,
    },
  });

  const whatsapp = new WhatsAppDistributor({
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: env.WHATSAPP_ACCESS_TOKEN,
    templateName: env.WHATSAPP_TEMPLATE_NAME || 'deal_alert',
  });

  return new DistributionManager({ telegram, whatsapp, queue: new DealQueue() });
}

export { TelegramDistributor } from './TelegramDistributor.js';
export { WhatsAppDistributor } from './WhatsAppDistributor.js';
export { DistributionManager } from './DistributionManager.js';
export { DealQueue } from './DealQueue.js';
