import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthedRequest extends Request { userId?: string; }

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'auth_not_configured' });
    const decoded = jwt.verify(token, secret) as { sub?: string; id?: string };
    const userId = decoded.sub || decoded.id;
    if (!userId) return res.status(401).json({ error: 'invalid_token' });
    req.userId = userId;
    next();
  } catch {
    res.status(401).json({ error: 'invalid_token' });
  }
}
