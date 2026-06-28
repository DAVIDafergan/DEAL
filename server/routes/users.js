import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { createUser, findUserByEmail } from '../store/userStore.js';
import { signUserToken } from '../middleware/userAuth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'שם, אימייל וסיסמה הם שדות חובה' });
    }
    if (password.length < 6) return res.status(400).json({ error: 'הסיסמה חייבת להכיל לפחות 6 תווים' });
    const existing = await findUserByEmail(email);
    if (existing) return res.status(409).json({ error: 'האימייל כבר רשום במערכת' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser({ name, email, passwordHash, authProvider: 'local' });
    const token = signUserToken(user);
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('[users] register error:', err);
    res.status(500).json({ error: 'שגיאה ברישום, נסה שנית' });
  }
});

router.post('/login', authRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'אימייל וסיסמה הם שדות חובה' });
    const user = await findUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
    if (!user.password_hash || user.auth_provider === 'google') {
      return res.status(400).json({ error: 'חשבון זה משתמש בהתחברות עם Google — אנא היכנס עם Google' });
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
    const token = signUserToken(user);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('[users] login error:', err);
    res.status(500).json({ error: 'שגיאה בהתחברות, נסה שנית' });
  }
});

router.post('/google', authRateLimiter, async (req, res) => {
  try {
    const { credential } = req.body || {};
    if (!credential) return res.status(400).json({ error: 'Missing credential' });
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return res.status(503).json({ error: 'Google login not configured' });
    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    const payload = ticket.getPayload();
    const { email, name } = payload;
    if (!email) return res.status(400).json({ error: 'Google account has no email' });
    let user = await findUserByEmail(email);
    if (!user) {
      user = await createUser({ name: name || email, email, passwordHash: null, authProvider: 'google' });
    }
    const token = signUserToken(user);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('[users] google error:', err.message);
    res.status(401).json({ error: 'Google authentication failed' });
  }
});

export default router;
