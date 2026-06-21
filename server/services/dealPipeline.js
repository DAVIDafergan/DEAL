import { DealScanner } from '../../core/scanner/DealScanner.js';
import { AnomalyEngine } from '../../core/anomaly-engine/index.js';
import { generateDealNarrative } from '../../ai/index.js';
import { addDeal } from '../store/dealsStore.js';
import { recordDealSent } from '../store/statsStore.js';

/**
 * DealPipeline — "שורש ההרכבה" (composition root) שמחבר את כל השכבות זו לזו:
 * sources -> anomaly-engine -> ai (נרטיב) -> store -> distribution.
 * זה המקום היחיד באפליקציה שמכיר את כל השכבות; שום שכבה אחרת לא תלויה בו.
 *
 * Composition root wiring sources -> anomaly-engine -> ai -> store -> distribution.
 * No other layer depends on this module; it only depends on them.
 */
export class DealPipeline {
  constructor({ sourceRegistry, distributionManager, whatsappRecipients = [] }) {
    this.sourceRegistry = sourceRegistry;
    this.distributionManager = distributionManager;
    this.whatsappRecipients = whatsappRecipients;

    this.scanner = new DealScanner({
      sourceRegistry,
      anomalyEngine: new AnomalyEngine(),
      onDealDetected: (deal) => this._handleDeal(deal),
    });
  }

  /** @param {Array<{origin:string, destination:string, date:string}>} routes */
  async runScan(routes) {
    return this.scanner.scanRoutes(routes);
  }

  async _handleDeal(deal) {
    let narrative;
    try {
      narrative = await generateDealNarrative(deal);
    } catch (err) {
      // אם ה-AI נכשל, עדיין שומרים את הדיל הגולמי כדי שלא יאבד, רק בלי נרטיב שיווקי
      narrative = this._fallbackNarrative(deal);
    }

    const storedDeal = addDeal({ offer: deal.offer, analysis: deal.analysis, narrative });

    const savingsPercent = Math.round(
      ((deal.analysis.movingAverage - deal.offer.price) / deal.analysis.movingAverage) * 100
    );

    if (this.distributionManager) {
      this.distributionManager.enqueueDeal(narrative, { whatsappRecipients: this.whatsappRecipients });
      const results = await this.distributionManager.flush();
      const anySucceeded = results.some((r) => r.success);
      if (anySucceeded) {
        recordDealSent({ savingsPercent });
      }
    }

    return storedDeal;
  }

  _fallbackNarrative(deal) {
    const plain = {
      title: `${deal.offer.origin} -> ${deal.offer.destination}: ${deal.offer.price} ${deal.offer.currency}`,
      description: deal.analysis.explanation,
      riskWarning: 'AI narrative generation failed; review this deal manually before distributing further.',
    };
    return { he: plain, en: plain, es: plain };
  }
}
