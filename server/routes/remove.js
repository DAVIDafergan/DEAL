import { Router } from 'express';
import { findPropertiesByContact, createVerificationCode, verifyCode, removeAndBlock } from '../store/propertyStore.js';
import { normalizePhone, normalizeDomain } from '../../core/compliance/blocklist.js';
import { sendVerificationCode } from '../services/complianceMessaging.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

function maskPhone(phone) {
  return phone.replace(/.(?=.{4})/g, '•');
}

/**
 * POST /api/remove/request — { type: 'phone'|'domain', value }
 * Deliberately generic on "not found" (never confirms whether a phone/domain exists in our
 * data) — but this is a compliance tool for real property owners, not a login form, so once a
 * match *is* found we're direct about it (masked phone shown) rather than staying vague.
 */
router.post('/request', authRateLimiter, async (req, res) => {
  try {
    const { type, value } = req.body || {};
    if (type !== 'phone' && type !== 'domain') return res.status(400).json({ error: 'type must be "phone" or "domain"' });
    if (!value) return res.status(400).json({ error: 'value is required' });

    if (type === 'phone') {
      const normalized = normalizePhone(value);
      const properties = await findPropertiesByContact({ phone: normalized });
      if (properties.length === 0) {
        return res.json({ ok: true, note: 'אם הנכס נמצא במערכת, קוד אימות נשלח' });
      }
      const code = await createVerificationCode('removal_phone', normalized);
      await sendVerificationCode(normalized, code);
      return res.json({ ok: true, sentTo: maskPhone(normalized) });
    }

    // type === 'domain'
    const normalized = normalizeDomain(value);
    const properties = await findPropertiesByContact({ domain: normalized });
    if (properties.length === 0) {
      return res.json({ ok: true, note: 'אם הנכס נמצא במערכת, קוד אימות נשלח' });
    }
    const targetPhone = properties.map((p) => p.whatsapp || p.phone).find(Boolean);
    if (!targetPhone) {
      return res.status(422).json({
        error: `לא נמצא מספר טלפון לאימות אוטומטי עבור דומיין זה. לבקשת הסרה ידנית פנו אלינו: ${process.env.SUPPORT_EMAIL || 'support@dealim.org'}`,
      });
    }
    const code = await createVerificationCode('removal_domain', normalized);
    await sendVerificationCode(targetPhone, code);
    return res.json({ ok: true, sentTo: maskPhone(targetPhone) });
  } catch (err) {
    console.error('[remove] request error:', err.message);
    res.status(500).json({ error: 'שגיאה בשליחת קוד האימות' });
  }
});

/** POST /api/remove/verify — { type, value, code } — on success, removal is immediate and permanent. */
router.post('/verify', authRateLimiter, async (req, res) => {
  try {
    const { type, value, code } = req.body || {};
    if (type !== 'phone' && type !== 'domain') return res.status(400).json({ error: 'type must be "phone" or "domain"' });
    if (!value || !code) return res.status(400).json({ error: 'value and code are required' });

    const purpose = type === 'phone' ? 'removal_phone' : 'removal_domain';
    const normalized = type === 'phone' ? normalizePhone(value) : normalizeDomain(value);
    const ok = await verifyCode(purpose, normalized, code);
    if (!ok) return res.status(400).json({ error: 'קוד שגוי או שפג תוקפו' });

    const removedCount = await removeAndBlock({
      phone: type === 'phone' ? normalized : undefined,
      domain: type === 'domain' ? normalized : undefined,
      method: 'remove_page',
    });
    res.json({ ok: true, removedCount });
  } catch (err) {
    console.error('[remove] verify error:', err.message);
    res.status(500).json({ error: 'שגיאה בביצוע ההסרה' });
  }
});

export default router;
