import type { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error('[error]', err);
  const status = err.status || (err.name === 'ZodError' || err.name === 'CastError' ? 400 : 500);
  res.status(status).json({ error: err.message || 'internal_error' });
}
