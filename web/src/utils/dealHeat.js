/**
 * חישוב "עוצמת חום" לדיל לצורך הצגה על המפה: אחוז הנחה מול הממוצע ההיסטורי, ומיפוי לשכבת צבע/גודל.
 * Heat-tier thresholds per spec: 25-35% = mild (yellow), 35-50% = hot (orange), 50%+ = blazing (red).
 */
export function getDiscountPercent(deal) {
  if (!deal?.movingAverage || !deal?.price) return 0;
  return Math.max(0, Math.round(((deal.movingAverage - deal.price) / deal.movingAverage) * 100));
}

export function getHeatTier(discountPercent) {
  if (discountPercent >= 50) return 'blazing';
  if (discountPercent >= 35) return 'hot';
  return 'mild';
}

/** רדיוס הנקודה ועוצמת ה-glow על המפה, לפי שכבת החום — ככל שחם יותר, גדול וזוהר יותר */
export const HEAT_TIER_CONFIG = {
  mild: { color: 'var(--color-heat-mild)', radius: 6, glowBlur: 4, pulseScale: 1.35, pulseDuration: 2.6 },
  hot: { color: 'var(--color-heat-hot)', radius: 8, glowBlur: 7, pulseScale: 1.55, pulseDuration: 2.1 },
  blazing: { color: 'var(--color-heat-blazing)', radius: 10, glowBlur: 11, pulseScale: 1.8, pulseDuration: 1.5 },
};
