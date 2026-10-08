import type { Request, Response } from 'express';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

function passwordHash(password: string, salt = crypto.randomBytes(16).toString('hex')) {
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}

function passwordMatches(password: string, saved: string) {
  const [salt, hash] = saved.split(':');
  if (!salt || !hash) return false;
  const actual = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function tokenFor(id: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  const expiresIn = (process.env.JWT_EXPIRES || '7d') as jwt.SignOptions['expiresIn'];
  return jwt.sign({ sub: id }, secret, { expiresIn });
}

export async function signup(req: Request, res: Response) {
  if (!process.env.JWT_SECRET) return res.status(503).json({ error: 'Authentication is not configured.' });
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!name || name.length > 100 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
    return res.status(400).json({ error: 'Enter a name, valid email, and password with at least 8 characters.' });
  }
  try {
    const user = await User.create({ name, email, passwordHash: passwordHash(password) });
    return res.status(201).json({ token: tokenFor(user.id), user: { id: user.id, name: user.name, email: user.email } });
  } catch (error: any) {
    if (error?.code === 11000) return res.status(409).json({ error: 'An account with this email already exists.' });
    throw error;
  }
}

export async function login(req: Request, res: Response) {
  if (!process.env.JWT_SECRET) return res.status(503).json({ error: 'Authentication is not configured.' });
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !passwordMatches(password, user.passwordHash)) return res.status(401).json({ error: 'Invalid email or password.' });
  return res.json({ token: tokenFor(user.id), user: { id: user.id, name: user.name, email: user.email } });
}

export async function getMe(req: Request, res: Response) {
  const userId = (req as Request & { userId?: string }).userId;
  const user = userId ? await User.findById(userId).select('_id name email') : null;
  if (!user) return res.status(404).json({ error: 'User not found.' });
  return res.json({ user: { id: user.id, name: user.name, email: user.email } });
}

export function logout(_req: Request, res: Response) {
  return res.json({ message: 'Logged out.' });
}
