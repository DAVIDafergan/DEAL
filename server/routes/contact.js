import { Router } from 'express';
import { getPool } from '../../core/db/index.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { name, email, phone, message } = req.body || {};
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'שם, אימייל והודעה הם שדות חובה' });
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ error: 'כתובת אימייל לא תקינה' });
    }
    if (message.trim().length < 5) {
      return res.status(400).json({ error: 'ההודעה קצרה מדי' });
    }
    await getPool().query(
      `INSERT INTO contact_submissions (name, email, phone, message, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [name.trim().slice(0, 255), email.trim().slice(0, 255), (phone || '').trim().slice(0, 32), message.trim().slice(0, 4000)]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[contact] error:', err.message);
    res.status(500).json({ error: 'שגיאה בשמירת הפנייה, נסה שנית' });
  }
});

router.get('/', requireAdminAuth, async (req, res) => {
  try {
    const [rows] = await getPool().query(
      `SELECT id, name, email, phone, message, is_read, created_at
       FROM contact_submissions ORDER BY created_at DESC LIMIT 200`
    );
    res.json({ submissions: rows });
  } catch (err) {
    console.error('[contact] list error:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.patch('/:id/read', requireAdminAuth, async (req, res) => {
  try {
    await getPool().query('UPDATE contact_submissions SET is_read=1 WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
