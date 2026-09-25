import { describe, it, expect, vi } from 'vitest';
import type { NextFunction, Response } from 'express';
import { authenticate, optionalAuth, requireRole } from './auth';
import type { AuthRequest } from './auth';

function createResponse() {
  const res: any = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res as Response;
}

function createRequest(authorization?: string, user?: AuthRequest['user']): AuthRequest {
  return {
    headers: authorization ? { authorization } : {},
    user,
  } as unknown as AuthRequest;
}

describe('authenticate', () => {
  it('rejects a request without a bearer token', async () => {
    const res = createResponse();
    const next = vi.fn() as unknown as NextFunction;

    await authenticate(createRequest(), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects an invalid token', async () => {
    const res = createResponse();
    const next = vi.fn() as unknown as NextFunction;

    await authenticate(createRequest('Bearer not-a-real-token'), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireRole', () => {
  it('blocks a role that is not allowed', () => {
    const res = createResponse();
    const next = vi.fn() as unknown as NextFunction;

    requireRole('ADMIN')(
      createRequest(undefined, { id: 'u1', email: 'artisan@demo.com', role: 'ARTISAN' }),
      res,
      next,
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('lets an allowed role through', () => {
    const res = createResponse();
    const next = vi.fn() as unknown as NextFunction;

    requireRole('ADMIN')(
      createRequest(undefined, { id: 'u1', email: 'admin@demo.com', role: 'ADMIN' }),
      res,
      next,
    );

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('optionalAuth', () => {
  it('continues anonymously when no token is present', async () => {
    const res = createResponse();
    const next = vi.fn() as unknown as NextFunction;
    const req = createRequest();

    await optionalAuth(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toBeUndefined();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('continues anonymously for an invalid token instead of failing', async () => {
    const res = createResponse();
    const next = vi.fn() as unknown as NextFunction;
    const req = createRequest('Bearer broken-token');

    await optionalAuth(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toBeUndefined();
    expect(res.status).not.toHaveBeenCalled();
  });
});
