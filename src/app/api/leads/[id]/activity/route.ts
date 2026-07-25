import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Lead from '@/models/Lead';
import Activity from '@/models/Activity';
import { withAuth } from '@/lib/middleware';

// GET /api/leads/:id/activity - Fetch activity logs for a lead (scoped to owner if member)
export const GET = withAuth(async (req, { params }) => {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    await connectDB();
    const lead = await Lead.findById(id);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Role boundaries: member must be assigned to this lead to view activity logs
    if (req.user.role === 'member') {
      const assignedId = lead.assignedTo ? lead.assignedTo.toString() : null;
      if (assignedId !== req.user.id) {
        return NextResponse.json({ error: 'Forbidden: You do not have access to this lead' }, { status: 403 });
      }
    }

    const activities = await Activity.find({ leadId: id })
      .sort({ createdAt: -1 })
      .populate('actorId', 'name email role');

    return NextResponse.json({ activities });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
