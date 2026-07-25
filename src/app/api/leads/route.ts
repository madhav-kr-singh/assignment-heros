import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Lead from '@/models/Lead';
import Activity from '@/models/Activity';
import { createLeadSchema } from '@/lib/validations/lead';
import { withAuth } from '@/lib/middleware';

// POST /api/leads - Public lead capture form (no auth required)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = createLeadSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    await connectDB();
    const newLead = new Lead({
      ...result.data,
      status: 'new',
    });

    await newLead.save();

    // ponytail: Log capture activity server-side automatically
    const newActivity = new Activity({
      leadId: newLead._id,
      action: 'lead_captured',
      meta: { source: newLead.source },
    });
    await newActivity.save();

    return NextResponse.json({ lead: newLead }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// GET /api/leads - Auth-scoped leads list with pagination, filtering, and search
export const GET = withAuth(async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10)));
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assignedTo');
    const search = searchParams.get('search');

    await connectDB();

    const query: any = {};

    // 1. Role scoping: members are restricted to leads assigned to them.
    if (req.user.role === 'member') {
      query.assignedTo = req.user.id;
    } else if (req.user.role === 'admin' && assignedTo) {
      query.assignedTo = assignedTo === 'unassigned' ? null : assignedTo;
    }

    // 2. Status filtering
    if (status) {
      query.status = status;
    }

    // 3. Search filter across name, email, and company
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { company: searchRegex },
      ];
    }

    const skip = (page - 1) * limit;
    const total = await Lead.countDocuments(query);
    const leads = await Lead.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('assignedTo', 'name email role');

    return NextResponse.json({
      leads,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
