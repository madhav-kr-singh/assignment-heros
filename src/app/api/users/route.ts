import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { hashPassword } from '@/lib/auth';
import { createUserSchema } from '@/lib/validations/auth';
import { withRole } from '@/lib/middleware';

// GET /api/users - List all users (admin only)
export const GET = withRole('admin', async () => {
  try {
    await connectDB();
    // ponytail: Exclude password hashes from the returned list for safety
    const users = await User.find({}, '-passwordHash').sort({ createdAt: -1 });
    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});

// POST /api/users - Create new user account (admin only)
export const POST = withRole('admin', async (req) => {
  try {
    const body = await req.json();
    const result = createUserSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { name, email, password, role } = result.data;

    await connectDB();
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const newUser = new User({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
      active: true,
    });

    await newUser.save();

    return NextResponse.json(
      {
        user: {
          id: newUser._id.toString(),
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          active: newUser.active,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
