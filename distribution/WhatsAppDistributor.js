import axios from 'axios';

/**
 * WhatsAppDistributor — אינטגרציה עם WhatsApp Business Cloud API הרשמי של Meta.
 * עובד מבוסס-תבניות (message templates) כנדרש על ידי WhatsApp להודעות יזומות (לא תגובה למשתמש).
 * יש להגדיר את התבנית מראש ב-Meta Business Manager; השם וה-placeholders כאן הם תצורה בלבד.
 *
 * Template-based by design (WhatsApp requires pre-approved templates for outbound messages
 * outside a user-initiated conversation window). Configuration is placeholder-only — actual
 * template approval happens in Meta Business Manager, outside this codebase.
 */
export class WhatsAppDistributor {
  constructor({
    apiVersion = 'v19.0',
    phoneNumberId,
    accessToken,
    templateName = 'deal_alert', // PLACEHOLDER: template must be created & approved in Meta Business Manager
    languageCodeMap = { he: 'he', en: 'en_US', es: 'es' },
  } = {}) {
    this.apiVersion = apiVersion;
    this.phoneNumberId = phoneNumberId;
    this.accessToken = accessToken;
    this.templateName = templateName;
    this.languageCodeMap = languageCodeMap;
  }

  isConfigured() {
    return Boolean(this.phoneNumberId && this.accessToken);
  }

  get name() {
    return 'whatsapp';
  }

  get _endpoint() {
    return `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;
  }

  /**
   * שולח הודעת תבנית למספר נתון, עם פרמטרים שמתאימים למבנה התבנית (placeholders).
   * Template body placeholders (example template "deal_alert"):
   *   {{1}} = title, {{2}} = description, {{3}} = riskWarning
   */
  async sendDealNarrative(narrative, lang, toPhoneNumber) {
    if (!this.isConfigured()) {
      throw new Error('WhatsAppDistributor is not configured: missing WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN');
    }
    if (!toPhoneNumber) {
      throw new Error('WhatsAppDistributor.sendDealNarrative requires a destination phone number');
    }

    const languageCode = this.languageCodeMap[lang] || this.languageCodeMap.en;

    const payload = {
      messaging_product: 'whatsapp',
      to: toPhoneNumber,
      type: 'template',
      template: {
        name: this.templateName,
        language: { code: languageCode },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: narrative.title },
              { type: 'text', text: narrative.description },
              { type: 'text', text: narrative.riskWarning },
            ],
          },
        ],
      },
    };

    await axios.post(this._endpoint, payload, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    return { channel: 'whatsapp', lang, toPhoneNumber, templateName: this.templateName };
  }
}
