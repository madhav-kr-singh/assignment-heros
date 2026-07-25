import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { updateUserSchema } from '@/lib/validations/auth';
import { withRole } from '@/lib/middleware';

export const PATCH = withRole('admin', async (req, { params }) => {
  try {
    // Next.js 15/16 App Router requires awaiting params
    const resolvedParams = await params;
    const id = resolvedParams.id;
    
    const body = await req.json();
    const result = updateUserSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    await connectDB();
    
    // ponytail: Self-deactivation protection check to prevent lockouts
    if (id === req.user.id) {
      if (result.data.active === false || result.data.role === 'member') {
        return NextResponse.json(
          { error: 'Self-deactivation or self-downgrading role is not permitted' },
          { status: 400 }
        );
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: result.data },
      { new: true, select: '-passwordHash' }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
