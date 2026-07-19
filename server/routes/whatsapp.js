import { Router } from 'express';
import { handleInboundReply } from '../services/complianceMessaging.js';

const router = Router();

/**
 * POST /api/whatsapp/inbound — inbound message webhook. Not yet subscribed to a live WhatsApp
 * Business number (that's an external Meta dashboard step, plus real send needs
 * PROPERTY_MESSAGING_ENABLED=true — see server/services/complianceMessaging.js), but the
 * "reply הסר → auto opt-out" logic itself is real and callable today, e.g. to test:
 *   curl -X POST /api/whatsapp/inbound -d '{"from":"0501234567","text":"הסר"}'
 *
 * Body shape is intentionally the minimal {from, text} rather than Meta's full Cloud API
 * envelope — swap this handler's body-parsing for the real webhook payload shape once a
 * WhatsApp Business number is actually wired up.
 */
router.post('/inbound', async (req, res) => {
  try {
    const { from, text } = req.body || {};
    if (!from || !text) return res.status(400).json({ error: 'from and text are required' });
    const result = await handleInboundReply(from, text);
    res.json(result);
  } catch (err) {
    console.error('[whatsapp] inbound webhook error:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
