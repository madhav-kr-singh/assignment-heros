import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Lead, { LeadStatus } from '@/models/Lead';
import Activity from '@/models/Activity';
import { updateLeadSchema } from '@/lib/validations/lead';
import { withAuth } from '@/lib/middleware';

// ponytail: Lean state validation helper
function isValidTransition(oldStatus: LeadStatus, newStatus: LeadStatus): boolean {
  if (oldStatus === newStatus) return true;
  
  // Cannot transition out of won or lost (final states)
  if (oldStatus === 'won' || oldStatus === 'lost') return false;

  // Cannot transition back to 'new' from any other state
  if (newStatus === 'new' && oldStatus !== 'new') return false;

  return true;
}

// GET /api/leads/:id - Fetch details (restricted to assignee if member)
export const GET = withAuth(async (req, { params }) => {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    await connectDB();
    const lead = await Lead.findById(id).populate('assignedTo', 'name email role');

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Member access scoping check
    if (req.user.role === 'member') {
      const assignedId = lead.assignedTo 
        ? (typeof lead.assignedTo === 'object' && '_id' in lead.assignedTo 
            ? (lead.assignedTo as any)._id.toString() 
            : (lead.assignedTo as any).toString()) 
        : null;

      if (assignedId !== req.user.id) {
        return NextResponse.json({ error: 'Forbidden: You do not have access to this lead' }, { status: 403 });
      }
    }

    return NextResponse.json({ lead });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});

// PATCH /api/leads/:id - Update status, assignee, or lead metadata
export const PATCH = withAuth(async (req, { params }) => {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    const body = await req.json();
    const result = updateLeadSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    await connectDB();
    const lead = await Lead.findById(id);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const { status, assignedTo, name, email, phone, company, source } = result.data;
    const assignedId = lead.assignedTo ? lead.assignedTo.toString() : null;

    // 1. Role boundaries validation
    if (req.user.role === 'member') {
      // Members can only touch their own assigned leads
      if (assignedId !== req.user.id) {
        return NextResponse.json({ error: 'Forbidden: You do not have access to this lead' }, { status: 403 });
      }
      // Members cannot reassign leads (only admin)
      if (assignedTo !== undefined) {
        return NextResponse.json({ error: 'Forbidden: Only administrators can assign leads' }, { status: 403 });
      }
    }

    // 2. Status pipeline transition validation
    if (status && status !== lead.status) {
      if (!isValidTransition(lead.status, status)) {
        return NextResponse.json(
          { error: `Invalid status transition from ${lead.status} to ${status}` },
          { status: 422 }
        );
      }
    }

    // 3. Apply updates & queue activities to log
    const activitiesToSave = [];

    if (status && status !== lead.status) {
      activitiesToSave.push(
        new Activity({
          leadId: lead._id,
          actorId: req.user.id,
          action: 'status_changed',
          meta: { oldStatus: lead.status, newStatus: status },
        })
      );
      lead.status = status;
    }

    if (assignedTo !== undefined) {
      const newAssignedTo = assignedTo === null ? undefined : assignedTo;
      if (lead.assignedTo?.toString() !== newAssignedTo) {
        activitiesToSave.push(
          new Activity({
            leadId: lead._id,
            actorId: req.user.id,
            action: 'lead_assigned',
            meta: {
              oldAssignedTo: lead.assignedTo || null,
              newAssignedTo: newAssignedTo || null,
            },
          })
        );
        lead.assignedTo = newAssignedTo as any;
      }
    }

    if (name) lead.name = name;
    if (email) lead.email = email;
    if (phone) lead.phone = phone;
    if (company) lead.company = company;
    if (source) lead.source = source;

    await lead.save();

    for (const activity of activitiesToSave) {
      await activity.save();
    }

    const updatedLead = await Lead.findById(lead._id).populate('assignedTo', 'name email role');
    return NextResponse.json({ lead: updatedLead });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
