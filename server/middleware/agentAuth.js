import jwt from 'jsonwebtoken';

export function requireAgentAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const secret = process.env.JWT_SECRET || 'deal-radar-agent-secret';
    const payload = jwt.verify(token, secret);
    req.agentId = payload.agentId;
    req.agentStatus = payload.status;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function signAgentToken(agent) {
  const secret = process.env.JWT_SECRET || 'deal-radar-agent-secret';
  return jwt.sign({ agentId: agent.id, status: agent.status }, secret, { expiresIn: '30d' });
}
