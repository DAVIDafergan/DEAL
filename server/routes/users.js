import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import {
  createUser, findUserByEmail, findUserByIdRaw, deleteUserById, updateUserName, setUserPasswordHash,
  getFavoritePropertyIds, addFavorite, removeFavorite, getRecentlyViewedPropertyIds, recordRecentlyViewed,
} from '../store/userStore.js';
import { signUserToken, requireUserAuth } from '../middleware/userAuth.js';
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

router.patch('/me', requireUserAuth, async (req, res) => {
  try {
    const name = (req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'שם הוא שדה חובה' });
    const user = await updateUserName(req.user.userId, name);
    res.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('[users] update profile error:', err.message);
    res.status(500).json({ error: 'שגיאה בעדכון הפרופיל' });
  }
});

router.patch('/me/password', requireUserAuth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body || {};
    if (!new_password || new_password.length < 6) return res.status(400).json({ error: 'הסיסמה החדשה חייבת להכיל לפחות 6 תווים' });
    const user = await findUserByIdRaw(req.user.userId);
    if (!user) return res.status(404).json({ error: 'משתמש לא נמצא' });
    if (!user.password_hash || user.auth_provider === 'google') {
      return res.status(400).json({ error: 'חשבון זה מחובר דרך Google — אין סיסמה לשנות' });
    }
    const ok = await bcrypt.compare(current_password || '', user.password_hash);
    if (!ok) return res.status(401).json({ error: 'הסיסמה הנוכחית שגויה' });
    const newHash = await bcrypt.hash(new_password, 10);
    await setUserPasswordHash(user.id, newHash);
    res.json({ ok: true });
  } catch (err) {
    console.error('[users] change password error:', err.message);
    res.status(500).json({ error: 'שגיאה בשינוי הסיסמה' });
  }
});

router.delete('/me', requireUserAuth, async (req, res) => {
  try {
    await deleteUserById(req.user.userId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[users] delete account error:', err.message);
    res.status(500).json({ error: 'שגיאה במחיקת החשבון' });
  }
});

// 11.21 — account-backed favorites/recently-viewed. propertyId is validated as an integer only
// (not existence) — INSERT IGNORE / ON DUPLICATE KEY below silently no-op on a bad FK, same
// "don't fail loudly on a best-effort write" pattern as the rest of this file.
router.get('/favorites', requireUserAuth, async (req, res) => {
  try {
    res.json({ favorites: await getFavoritePropertyIds(req.user.userId) });
  } catch (err) {
    console.error('[users] get favorites error:', err.message);
    res.status(500).json({ error: 'שגיאה בטעינת המועדפים' });
  }
});

router.post('/favorites/:propertyId', requireUserAuth, async (req, res) => {
  const propertyId = Number(req.params.propertyId);
  if (!Number.isInteger(propertyId)) return res.status(400).json({ error: 'מזהה נכס לא תקין' });
  try {
    await addFavorite(req.user.userId, propertyId);
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('[users] add favorite error:', err.message);
    res.status(500).json({ error: 'שגיאה בשמירת המועדף' });
  }
});

router.delete('/favorites/:propertyId', requireUserAuth, async (req, res) => {
  const propertyId = Number(req.params.propertyId);
  if (!Number.isInteger(propertyId)) return res.status(400).json({ error: 'מזהה נכס לא תקין' });
  try {
    await removeFavorite(req.user.userId, propertyId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[users] remove favorite error:', err.message);
    res.status(500).json({ error: 'שגיאה בהסרת המועדף' });
  }
});

router.get('/recently-viewed', requireUserAuth, async (req, res) => {
  try {
    res.json({ propertyIds: await getRecentlyViewedPropertyIds(req.user.userId) });
  } catch (err) {
    console.error('[users] get recently-viewed error:', err.message);
    res.status(500).json({ error: 'שגיאה בטעינת הנצפים לאחרונה' });
  }
});

router.post('/recently-viewed/:propertyId', requireUserAuth, async (req, res) => {
  const propertyId = Number(req.params.propertyId);
  if (!Number.isInteger(propertyId)) return res.status(400).json({ error: 'מזהה נכס לא תקין' });
  try {
    await recordRecentlyViewed(req.user.userId, propertyId);
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('[users] record recently-viewed error:', err.message);
    res.status(500).json({ error: 'שגיאה בשמירת הצפייה' });
  }
});

export default router;
