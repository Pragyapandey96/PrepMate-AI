import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { getMe, login, logout, signup } from '../controllers/auth.controllers.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();
const handle = (fn: (req: Request, res: Response) => unknown) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
authRouter.post('/signup', handle(signup));
authRouter.post('/login', handle(login));
authRouter.get('/me', requireAuth, handle(getMe));
authRouter.post('/logout', requireAuth, handle(logout));
