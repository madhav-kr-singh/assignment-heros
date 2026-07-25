import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loginSchema, createUserSchema } from '@/lib/validations/auth';
import { signToken, verifyToken, hashPassword, comparePassword } from '@/lib/auth';
import { withAuth, withRole, AuthenticatedRequest } from '@/lib/middleware';
import { NextResponse } from 'next/server';

// Mock DB connection and User Model
vi.mock('@/lib/db', () => ({
  connectDB: vi.fn().mockResolvedValue(null),
}));

// Mock User model default export
const mockFindById = vi.fn();
vi.mock('@/models/User', () => {
  return {
    default: {
      findById: (id: string) => mockFindById(id),
    },
  };
});

describe('Zod Auth Validation Schemas', () => {
  describe('loginSchema', () => {
    it('should validate correct login details', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid emails', () => {
      const result = loginSchema.safeParse({
        email: 'invalid-email',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject short passwords', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: '123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createUserSchema', () => {
    it('should validate valid user registration details', () => {
      const result = createUserSchema.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'member',
      });
      expect(result.success).toBe(true);
    });

    it('should default role to member if not provided', () => {
      const result = createUserSchema.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('member');
      }
    });

    it('should reject invalid roles', () => {
      const result = createUserSchema.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'invalid_role',
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('JWT and Bcrypt Auth Utilities', () => {
  it('should hash and compare passwords correctly', async () => {
    const password = 'mySecurePassword';
    const hash = await hashPassword(password);
    expect(hash).not.toBe(password);
    
    const isMatch = await comparePassword(password, hash);
    expect(isMatch).toBe(true);

    const isNotMatch = await comparePassword('wrongPassword', hash);
    expect(isNotMatch).toBe(false);
  });

  it('should sign and verify JWT tokens successfully', () => {
    const payload = {
      id: '507f1f77bcf86cd799439011',
      email: 'test@example.com',
      role: 'admin' as const,
    };

    const token = signToken(payload);
    expect(token).toBeTypeOf('string');

    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.id).toBe(payload.id);
    expect(decoded?.email).toBe(payload.email);
    expect(decoded?.role).toBe(payload.role);
  });

  it('should return null for invalid or expired tokens', () => {
    const decoded = verifyToken('invalid.jwt.token');
    expect(decoded).toBeNull();
  });
});

describe('Auth and Permission Middleware Wrappers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should block requests without a token', async () => {
    const req = new Request('http://localhost/api/leads', {
      headers: new Headers(),
    });
    
    const handler = vi.fn().mockResolvedValue(new Response('Success'));
    const wrapped = withAuth(handler);
    
    const res = await wrapped(req, {});
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Authentication required');
    expect(handler).not.toHaveBeenCalled();
  });

  it('should authenticate user with valid token and active account', async () => {
    const payload = {
      id: '507f1f77bcf86cd799439011',
      email: 'active@example.com',
      role: 'member' as const,
    };
    const token = signToken(payload);

    const req = new Request('http://localhost/api/leads', {
      headers: new Headers({
        'cookie': `auth_token=${token}`,
      }),
    });

    mockFindById.mockResolvedValue({
      _id: payload.id,
      email: payload.email,
      role: payload.role,
      active: true,
    });

    const handler = vi.fn().mockImplementation((r: AuthenticatedRequest) => {
      return NextResponse.json({ success: true, user: r.user });
    });

    const wrapped = withAuth(handler);
    const res = await wrapped(req, {});

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.user.id).toBe(payload.id);
    expect(body.user.role).toBe(payload.role);
    expect(handler).toHaveBeenCalled();
  });

  it('should block requests if the user is deactivated', async () => {
    const payload = {
      id: '507f1f77bcf86cd799439011',
      email: 'deactivated@example.com',
      role: 'member' as const,
    };
    const token = signToken(payload);

    const req = new Request('http://localhost/api/leads', {
      headers: new Headers({
        'cookie': `auth_token=${token}`,
      }),
    });

    mockFindById.mockResolvedValue({
      _id: payload.id,
      email: payload.email,
      role: payload.role,
      active: false,
    });

    const handler = vi.fn();
    const wrapped = withAuth(handler);
    const res = await wrapped(req, {});

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('deactivated');
    expect(handler).not.toHaveBeenCalled();
  });

  it('should allow admin access to admin-only routes', async () => {
    const payload = {
      id: '507f1f77bcf86cd799439012',
      email: 'admin@example.com',
      role: 'admin' as const,
    };
    const token = signToken(payload);

    const req = new Request('http://localhost/api/users', {
      headers: new Headers({
        'cookie': `auth_token=${token}`,
      }),
    });

    mockFindById.mockResolvedValue({
      _id: payload.id,
      email: payload.email,
      role: payload.role,
      active: true,
    });

    const handler = vi.fn().mockResolvedValue(new Response('Admin Success'));
    const wrapped = withRole('admin', handler);
    const res = await wrapped(req, {});

    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalled();
  });

  it('should block member access to admin-only routes', async () => {
    const payload = {
      id: '507f1f77bcf86cd799439011',
      email: 'member@example.com',
      role: 'member' as const,
    };
    const token = signToken(payload);

    const req = new Request('http://localhost/api/users', {
      headers: new Headers({
        'cookie': `auth_token=${token}`,
      }),
    });

    mockFindById.mockResolvedValue({
      _id: payload.id,
      email: payload.email,
      role: payload.role,
      active: true,
    });

    const handler = vi.fn();
    const wrapped = withRole('admin', handler);
    const res = await wrapped(req, {});

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Forbidden');
    expect(handler).not.toHaveBeenCalled();
  });
});
