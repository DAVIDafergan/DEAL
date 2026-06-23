import jwt from 'jsonwebtoken';

const SECRET = () => process.env.JWT_SECRET || 'deal-radar-jwt-secret-change-me';

export function requireAdminAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, SECRET());
    if (payload.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function signAdminToken() {
  return jwt.sign({ role: 'admin' }, SECRET(), { expiresIn: '24h' });
}
