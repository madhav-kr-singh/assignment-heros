import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';

// GET /api/auth/me - Retrieve current logged-in user info
export const GET = withAuth(async (req) => {
  return NextResponse.json({ user: req.user });
});
