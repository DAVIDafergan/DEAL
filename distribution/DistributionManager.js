import { DealQueue } from './DealQueue.js';

/**
 * DistributionManager — מתאם בין הדיל המוכן (נרטיב תלת-לשוני) לכל ערוצי ההפצה.
 * כל ערוץ רץ באופן עצמאי דרך התור: כשל בערוץ אחד (למשל Telegram down) לא מונע מ-WhatsApp
 * לקבל את הדיל, והדיל לא הולך לאיבוד — הוא חוזר לתור לפי מדיניות ה-retry של DealQueue.
 *
 * Orchestrates distribution across channels via the shared retry queue, so one channel's
 * failure never blocks or loses delivery on another channel.
 */
export class DistributionManager {
  constructor({ telegram, whatsapp, queue = new DealQueue() } = {}) {
    this.telegram = telegram;
    this.whatsapp = whatsapp;
    this.queue = queue;
  }

  /**
   * @param {{he: object, en: object, es: object}} multiLangNarrative
   * @param {{whatsappRecipients?: string[]}} options
   */
  enqueueDeal(multiLangNarrative, { whatsappRecipients = [] } = {}) {
    if (this.telegram?.isConfigured()) {
      this.queue.enqueue({ type: 'telegram-broadcast', multiLangNarrative });
    }

    if (this.whatsapp?.isConfigured()) {
      for (const toPhoneNumber of whatsappRecipients) {
        this.queue.enqueue({ type: 'whatsapp-send', multiLangNarrative, toPhoneNumber, lang: 'en' });
      }
    }
  }

  /** מריץ את כל התור כעת ומחזיר תוצאה לכל job (הצלחה/כשלון) */
  async flush() {
    return this.queue.drain((job) => this._handleJob(job));
  }

  async _handleJob(job) {
    if (job.type === 'telegram-broadcast') {
      const results = await this.telegram.broadcastAllLanguages(job.multiLangNarrative);
      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length > 0) {
        throw new Error(`Telegram broadcast partially failed: ${failed.map((f) => f.reason?.message).join('; ')}`);
      }
      return results;
    }

    if (job.type === 'whatsapp-send') {
      return this.whatsapp.sendDealNarrative(job.multiLangNarrative[job.lang], job.lang, job.toPhoneNumber);
    }

    throw new Error(`Unknown distribution job type: ${job.type}`);
  }
}
