/**
 * חישוב "עוצמת חום" לדיל לצורך הצגה על המפה: אחוז הנחה מול הממוצע ההיסטורי, ומיפוי לשכבת צבע/גודל.
 * Heat-tier thresholds per spec: 25-35% = mild (yellow), 35-50% = hot (orange), 50%+ = blazing (red).
 */
export function getDiscountPercent(deal) {
  if (!deal?.movingAverage || !deal?.price) return 0;
  return Math.max(0, Math.round(((deal.movingAverage - deal.price) / deal.movingAverage) * 100));
}

/**
 * דילי live_price אין להם השוואה להיסטוריה (אין movingAverage), אז אין להם "חום" אמיתי —
 * מקבלים שכבה ניטרלית נפרדת ('live') כדי לא להעביר רושם שקרי של אנומליה/דחיפות.
 * live_price deals have no historical baseline, so they get a separate neutral tier
 * instead of being forced into the heat scale (which implies a proven anomaly).
 */
export function getHeatTier(deal) {
  if (deal?.type !== 'anomaly') return 'live';
  const discountPercent = getDiscountPercent(deal);
  if (discountPercent >= 50) return 'blazing';
  if (discountPercent >= 35) return 'hot';
  return 'mild';
}

/** רדיוס הנקודה ועוצמת ה-glow על המפה, לפי שכבת החום — ככל שחם יותר, גדול וזוהר יותר */
export const HEAT_TIER_CONFIG = {
  live: { color: 'var(--color-accent-from)', radius: 5, glowBlur: 3, pulseScale: 1.2, pulseDuration: 3.2 },
  mild: { color: 'var(--color-heat-mild)', radius: 6, glowBlur: 4, pulseScale: 1.35, pulseDuration: 2.6 },
  hot: { color: 'var(--color-heat-hot)', radius: 8, glowBlur: 7, pulseScale: 1.55, pulseDuration: 2.1 },
  blazing: { color: 'var(--color-heat-blazing)', radius: 10, glowBlur: 11, pulseScale: 1.8, pulseDuration: 1.5 },
};
