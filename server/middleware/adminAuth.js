export function requireAdminAuth(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const token = header.slice(7);
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin-change-me';
  if (token !== adminPassword) return res.status(401).json({ error: 'Forbidden' });
  next();
}
