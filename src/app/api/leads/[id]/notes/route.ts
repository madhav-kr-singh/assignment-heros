import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Lead from '@/models/Lead';
import Note from '@/models/Note';
import Activity from '@/models/Activity';
import { addNoteSchema } from '@/lib/validations/lead';
import { withAuth } from '@/lib/middleware';

// POST /api/leads/:id/notes - Add a note to a lead (scoped to owner if member)
export const POST = withAuth(async (req, { params }) => {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    const body = await req.json();
    const result = addNoteSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    await connectDB();
    const lead = await Lead.findById(id);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Role boundaries: member must be assigned to this lead to add notes
    if (req.user.role === 'member') {
      const assignedId = lead.assignedTo ? lead.assignedTo.toString() : null;
      if (assignedId !== req.user.id) {
        return NextResponse.json({ error: 'Forbidden: You do not have access to this lead' }, { status: 403 });
      }
    }

    const newNote = new Note({
      leadId: lead._id,
      authorId: req.user.id,
      text: result.data.text,
    });
    await newNote.save();

    // ponytail: Auto-log note addition activity server-side
    const newActivity = new Activity({
      leadId: lead._id,
      actorId: req.user.id,
      action: 'note_added',
      meta: { noteId: newNote._id, snippet: result.data.text.substring(0, 60) },
    });
    await newActivity.save();

    const populatedNote = await Note.findById(newNote._id).populate('authorId', 'name email role');

    return NextResponse.json({ note: populatedNote }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});

// GET /api/leads/:id/notes - Fetch notes for a lead (scoped to owner if member)
export const GET = withAuth(async (req, { params }) => {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    await connectDB();
    const lead = await Lead.findById(id);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (req.user.role === 'member') {
      const assignedId = lead.assignedTo ? lead.assignedTo.toString() : null;
      if (assignedId !== req.user.id) {
        return NextResponse.json({ error: 'Forbidden: You do not have access to this lead' }, { status: 403 });
      }
    }

    const notes = await Note.find({ leadId: id })
      .sort({ createdAt: 1 })
      .populate('authorId', 'name email role');

    return NextResponse.json({ notes });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
