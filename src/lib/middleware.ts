import { NextResponse } from 'next/server';
  import { verifyToken, TokenPayload } from './auth';
  
  export interface AuthenticatedRequest extends Request {
    user: TokenPayload;
  }
  
  type RouteHandler = (
    req: AuthenticatedRequest,
    context: any
  ) => Promise<Response> | Response;
  
  export function withAuth(handler: RouteHandler) {
    return async (req: Request, context: any) => {
      // 1. Retrieve the token from cookies or Authorization header
      const cookies = req.headers.get('cookie') || '';
      const tokenCookie = cookies
        .split(';')
        .map((c) => c.trim())
        .find((c) => c.startsWith('auth_token='));
  
      let token = '';
      if (tokenCookie) {
        token = tokenCookie.substring('auth_token='.length);
      } else {
        const authHeader = req.headers.get('authorization') || '';
        if (authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }
      }
  
      if (!token) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
  
      const decoded = verifyToken(token);
      if (!decoded) {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
      }
  
      // 2. Load DB and User model dynamically to check active status
      const { connectDB } = await import('./db');
      const User = (await import('@/models/User')).default;
  
      await connectDB();
      const userRecord = await User.findById(decoded.id);
  
      if (!userRecord || !userRecord.active) {
        return NextResponse.json(
          { error: 'User account is deactivated or does not exist' },
          { status: 401 }
        );
      }
  
      // 3. Attach user details to the request object
      const authReq = req as AuthenticatedRequest;
      authReq.user = {
        id: userRecord._id.toString(),
        email: userRecord.email,
        role: userRecord.role,
      };
  
      return handler(authReq, context);
    };
  }
  
  export function withRole(role: 'admin' | 'member', handler: RouteHandler) {
    return withAuth(async (req: AuthenticatedRequest, context: any) => {
      if (role === 'admin' && req.user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
      return handler(req, context);
    });
  }
