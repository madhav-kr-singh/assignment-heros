import './setup';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Lead from '@/models/Lead';
import Note from '@/models/Note';
import Activity from '@/models/Activity';
import { hashPassword, signToken } from '@/lib/auth';

// Import Route Handlers
import { POST as loginPOST } from '@/app/api/auth/login/route';
import { GET as usersGET, POST as usersPOST } from '@/app/api/users/route';
import { PATCH as userPATCH } from '@/app/api/users/[id]/route';
import { GET as leadsGET, POST as leadsPOST } from '@/app/api/leads/route';
import { GET as leadGET, PATCH as leadPATCH } from '@/app/api/leads/[id]/route';
import { GET as notesGET, POST as notesPOST } from '@/app/api/leads/[id]/notes/route';
import { GET as activityGET } from '@/app/api/leads/[id]/activity/route';

let adminToken = '';
let memberToken = '';
let deactivatedToken = '';

let adminId = '';
let memberId = '';
let deactivatedId = '';

let sharedLeadId = '';

beforeAll(async () => {
  await connectDB();

  // Clear data
  await User.deleteMany({});
  await Lead.deleteMany({});
  await Note.deleteMany({});
  await Activity.deleteMany({});

  // Seed Admin
  const adminHash = await hashPassword('admin123');
  const admin = new User({
    name: 'Admin User',
    email: 'admin@test.com',
    passwordHash: adminHash,
    role: 'admin',
    active: true,
  });
  await admin.save();
  adminId = admin._id.toString();
  adminToken = signToken({ id: adminId, email: admin.email, role: 'admin' });

  // Seed Member
  const memberHash = await hashPassword('member123');
  const member = new User({
    name: 'Member User',
    email: 'member@test.com',
    passwordHash: memberHash,
    role: 'member',
    active: true,
  });
  await member.save();
  memberId = member._id.toString();
  memberToken = signToken({ id: memberId, email: member.email, role: 'member' });

  // Seed Deactivated User
  const deactivatedHash = await hashPassword('deactivated123');
  const deactivated = new User({
    name: 'Deactivated User',
    email: 'deactivated@test.com',
    passwordHash: deactivatedHash,
    role: 'member',
    active: false,
  });
  await deactivated.save();
  deactivatedId = deactivated._id.toString();
  deactivatedToken = signToken({ id: deactivatedId, email: deactivated.email, role: 'member' });
});

afterAll(async () => {
  await User.deleteMany({});
  await Lead.deleteMany({});
  await Note.deleteMany({});
  await Activity.deleteMany({});
  await mongoose.connection.close();
});

describe('API Route Integration Tests', () => {
  describe('POST /api/auth/login', () => {
    it('should authenticate successfully with correct credentials', async () => {
      const req = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'admin@test.com', password: 'admin123' }),
      });
      const res = await loginPOST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user.email).toBe('admin@test.com');
      expect(data.user.role).toBe('admin');
    });

    it('should fail with incorrect password', async () => {
      const req = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'admin@test.com', password: 'wrongpassword' }),
      });
      const res = await loginPOST(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Invalid email or password');
    });

    it('should fail if user account is deactivated', async () => {
      const req = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'deactivated@test.com', password: 'deactivated123' }),
      });
      const res = await loginPOST(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Invalid email or password');
    });
  });

  describe('User Management API (Admin-Only)', () => {
    it('should block GET /api/users for member role', async () => {
      const req = new Request('http://localhost/api/users', {
        headers: { cookie: `auth_token=${memberToken}` },
      });
      const res = await usersGET(req, {});
      expect(res.status).toBe(403);
    });

    it('should allow GET /api/users for admin role', async () => {
      const req = new Request('http://localhost/api/users', {
        headers: { cookie: `auth_token=${adminToken}` },
      });
      const res = await usersGET(req, {});
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.users).toBeTypeOf('object');
      expect(data.users.length).toBeGreaterThan(0);
    });

    it('should allow Admin to create a new member', async () => {
      const req = new Request('http://localhost/api/users', {
        method: 'POST',
        headers: { cookie: `auth_token=${adminToken}` },
        body: JSON.stringify({
          name: 'New Member',
          email: 'newmember@test.com',
          password: 'newpassword123',
          role: 'member',
        }),
      });
      const res = await usersPOST(req, {});
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.user.email).toBe('newmember@test.com');
    });

    it('should block Admin from self-deactivating', async () => {
      const req = new Request(`http://localhost/api/users/${adminId}`, {
        method: 'PATCH',
        headers: { cookie: `auth_token=${adminToken}` },
        body: JSON.stringify({ active: false }),
      });
      const res = await userPATCH(req, { params: Promise.resolve({ id: adminId }) });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Self-deactivation');
    });
  });

  describe('Leads API & Lifecycle Scoping', () => {
    it('should allow public lead capture POST without auth', async () => {
      const req = new Request('http://localhost/api/leads', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Jane Smith',
          email: 'jane@smith.com',
          phone: '1234567890',
          company: 'Smith Inc',
          source: 'web_form',
        }),
      });
      const res = await leadsPOST(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      sharedLeadId = data.lead._id;
      expect(data.lead.name).toBe('Jane Smith');
      expect(data.lead.status).toBe('new');
    });

    it('should scope GET /api/leads so member sees 0 leads (since none are assigned)', async () => {
      const req = new Request('http://localhost/api/leads', {
        headers: { cookie: `auth_token=${memberToken}` },
      });
      const res = await leadsGET(req, {});
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.leads.length).toBe(0);
    });

    it('should allow admin to assign lead to member', async () => {
      const req = new Request(`http://localhost/api/leads/${sharedLeadId}`, {
        method: 'PATCH',
        headers: { cookie: `auth_token=${adminToken}` },
        body: JSON.stringify({ assignedTo: memberId }),
      });
      const res = await leadPATCH(req, { params: Promise.resolve({ id: sharedLeadId }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.lead.assignedTo._id).toBe(memberId);
    });

    it('should now allow member to view the assigned lead', async () => {
      const req = new Request(`http://localhost/api/leads/${sharedLeadId}`, {
        headers: { cookie: `auth_token=${memberToken}` },
      });
      const res = await leadGET(req, { params: Promise.resolve({ id: sharedLeadId }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.lead._id).toBe(sharedLeadId);
    });

    it('should block member from reassigning lead', async () => {
      const req = new Request(`http://localhost/api/leads/${sharedLeadId}`, {
        method: 'PATCH',
        headers: { cookie: `auth_token=${memberToken}` },
        body: JSON.stringify({ assignedTo: adminId }),
      });
      const res = await leadPATCH(req, { params: Promise.resolve({ id: sharedLeadId }) });
      expect(res.status).toBe(403);
    });

    it('should block member from updating status of unassigned lead', async () => {
      // 1. Create another public lead
      const createReq = new Request('http://localhost/api/leads', {
        method: 'POST',
        body: JSON.stringify({ name: 'Unassigned', email: 'unassigned@test.com', source: 'web' }),
      });
      const createRes = await leadsPOST(createReq);
      const createData = await createRes.json();
      const unassignedLeadId = createData.lead._id;

      // 2. Member tries to update status
      const req = new Request(`http://localhost/api/leads/${unassignedLeadId}`, {
        method: 'PATCH',
        headers: { cookie: `auth_token=${memberToken}` },
        body: JSON.stringify({ status: 'contacted' }),
      });
      const res = await leadPATCH(req, { params: Promise.resolve({ id: unassignedLeadId }) });
      expect(res.status).toBe(403);
    });

    it('should allow member to update status of assigned lead', async () => {
      const req = new Request(`http://localhost/api/leads/${sharedLeadId}`, {
        method: 'PATCH',
        headers: { cookie: `auth_token=${memberToken}` },
        body: JSON.stringify({ status: 'contacted' }),
      });
      const res = await leadPATCH(req, { params: Promise.resolve({ id: sharedLeadId }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.lead.status).toBe('contacted');
    });

    it('should reject invalid status transitions with 422', async () => {
      // Move lead to won (final state)
      const winReq = new Request(`http://localhost/api/leads/${sharedLeadId}`, {
        method: 'PATCH',
        headers: { cookie: `auth_token=${adminToken}` },
        body: JSON.stringify({ status: 'won' }),
      });
      await leadPATCH(winReq, { params: Promise.resolve({ id: sharedLeadId }) });

      // Try to transition out of won
      const req = new Request(`http://localhost/api/leads/${sharedLeadId}`, {
        method: 'PATCH',
        headers: { cookie: `auth_token=${adminToken}` },
        body: JSON.stringify({ status: 'contacted' }),
      });
      const res = await leadPATCH(req, { params: Promise.resolve({ id: sharedLeadId }) });
      expect(res.status).toBe(422);
    });
  });

  describe('Notes and Activities trail', () => {
    it('should allow adding note to assigned lead and auto-log activity', async () => {
      const noteText = 'This is an integration test note.';
      const req = new Request(`http://localhost/api/leads/${sharedLeadId}/notes`, {
        method: 'POST',
        headers: { cookie: `auth_token=${memberToken}` },
        body: JSON.stringify({ text: noteText }),
      });
      const res = await notesPOST(req, { params: Promise.resolve({ id: sharedLeadId }) });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.note.text).toBe(noteText);
      expect(data.note.authorId._id).toBe(memberId);

      // Verify activity trail has the note added action
      const actReq = new Request(`http://localhost/api/leads/${sharedLeadId}/activity`, {
        headers: { cookie: `auth_token=${memberToken}` },
      });
      const actRes = await activityGET(actReq, { params: Promise.resolve({ id: sharedLeadId }) });
      expect(actRes.status).toBe(200);
      const actData = await actRes.json();
      
      const hasNoteAdded = actData.activities.some((a: any) => a.action === 'note_added');
      expect(hasNoteAdded).toBe(true);
    });
  });
});
