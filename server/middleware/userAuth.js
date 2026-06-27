import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'deal-radar-jwt-secret-change-me';

export function signUserToken(user) {
  return jwt.sign({ userId: user.id, email: user.email }, SECRET, { expiresIn: '30d' });
}

export function requireUserAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
