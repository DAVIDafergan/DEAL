/** בונה טקסט שיתוף מעוצב לדיל — כולל הלינק עם ה-Marker, כדי שעמלת האפיליאייט תישמר גם בשיתוף */
export function buildShareText(deal, t) {
  const lines = [t.shareIntro, deal.title, `${Math.round(deal.price)} ${deal.currency}`];
  if (deal.bookingUrl) lines.push(deal.bookingUrl);
  return lines.join('\n');
}

/**
 * משתף דיל באמצעות Web Share API הנייטיבי (פותח את תפריט השיתוף של המכשיר — וואטסאפ/טלגרם/וכו').
 * אם הדפדפן לא תומך (בעיקר דסקטופ), מעתיק את הטקסט ל-clipboard כ-fallback מכובד.
 *
 * Shares via the native Web Share API; falls back to copying the formatted text to the
 * clipboard on browsers without share support (mostly desktop).
 */
export async function shareDeal(deal, t) {
  const text = buildShareText(deal, t);

  if (navigator.share) {
    try {
      await navigator.share({ title: deal.title, text, url: deal.bookingUrl || undefined });
      return { method: 'native' };
    } catch (err) {
      if (err.name === 'AbortError') return { method: 'cancelled' };
      // ממשיכים ל-fallback של clipboard למטה אם השיתוף הנייטיבי נכשל מסיבה אחרת
    }
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return { method: 'clipboard' };
  }

  return { method: 'unsupported' };
}
