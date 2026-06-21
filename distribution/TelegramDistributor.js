import axios from 'axios';

const TELEGRAM_API_BASE = 'https://api.telegram.org';

/**
 * TelegramDistributor — שולח דילים ל-Telegram Bot API הרשמי.
 * תומך בשני מצבי עבודה (לפי קונפיגורציה):
 *   1) ערוץ נפרד לכל שפה (channels: { he: '@channel_he', en: '@channel_en', es: '@channel_es' })
 *   2) ערוץ יחיד, עם שליחה בשפה שנבחרה על ידי כל subscriber (channels: { default: '@channel' })
 *
 * Official Telegram Bot API only (sendMessage via HTTPS) — no scraping, no unofficial clients.
 */
export class TelegramDistributor {
  constructor({ botToken, channels = {} } = {}) {
    this.botToken = botToken;
    this.channels = channels; // { he: 'chatId', en: 'chatId', es: 'chatId' } or { default: 'chatId' }
  }

  isConfigured() {
    return Boolean(this.botToken) && Object.values(this.channels).some(Boolean);
  }

  get name() {
    return 'telegram';
  }

  /** בוחר ערוץ יעד לשפה נתונה, עם נפילה ל-default אם לא הוגדר ערוץ ייעודי */
  _resolveChannel(lang) {
    return this.channels[lang] || this.channels.default;
  }

  async sendDealNarrative(narrative, lang) {
    if (!this.isConfigured()) {
      throw new Error('TelegramDistributor is not configured: missing TELEGRAM_BOT_TOKEN / channels');
    }

    const chatId = this._resolveChannel(lang);
    if (!chatId) {
      throw new Error(`No Telegram channel configured for language "${lang}"`);
    }

    const text = `*${narrative.title}*\n\n${narrative.description}\n\n_${narrative.riskWarning}_`;

    await axios.post(`${TELEGRAM_API_BASE}/bot${this.botToken}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    });

    return { channel: 'telegram', lang, chatId };
  }

  /** שולח את הדיל לכל השפות שיש להן ערוץ מוגדר (במצב "ערוץ נפרד לכל שפה") */
  async broadcastAllLanguages(multiLangNarrative) {
    const langs = Object.keys(multiLangNarrative).filter((lang) => this._resolveChannel(lang));
    return Promise.allSettled(langs.map((lang) => this.sendDealNarrative(multiLangNarrative[lang], lang)));
  }
}
