'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface Lead {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  source: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
  assignedTo?: User;
  createdAt: string;
}

interface Note {
  _id: string;
  text: string;
  authorId: User;
  createdAt: string;
}

interface Activity {
  _id: string;
  action: string;
  actorId?: User;
  meta?: Record<string, any>;
  createdAt: string;
}

export default function LeadDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = React.use(params); // Next.js 15+ async params resolution
  
  // States
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [users, setUsers] = useState<User[]>([]); // For reassignment (admin only)
  
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingNote, setSubmittingNote] = useState(false);
  const [updatingLead, setUpdatingLead] = useState(false);
  const [error, setError] = useState('');

  // 1. Fetch Session
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        setCurrentUser(data.user);
      } catch (err) {
        router.push('/login');
      }
    }
    checkSession();
  }, [router]);

  // 2. Fetch Lead, Notes, and Activities (ponytail: single load function)
  async function loadData() {
    try {
      const leadRes = await fetch(`/api/leads/${id}`);
      if (!leadRes.ok) {
        if (leadRes.status === 403) throw new Error('Forbidden: You do not have access to this lead.');
        if (leadRes.status === 404) throw new Error('Lead not found.');
        throw new Error('Failed to load lead details.');
      }
      const leadData = await leadRes.json();
      setLead(leadData.lead);

      const notesRes = await fetch(`/api/leads/${id}/notes`);
      if (notesRes.ok) {
        const notesData = await notesRes.json();
        setNotes(notesData.notes || []);
      }

      const activitiesRes = await fetch(`/api/leads/${id}/activity`);
      if (activitiesRes.ok) {
        const activitiesData = await activitiesRes.json();
        setActivities(activitiesData.activities || []);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading lead details.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!currentUser) return;
    loadData();
  }, [currentUser, id]);

  // 3. Fetch Assignees if Admin
  useEffect(() => {
    if (currentUser?.role !== 'admin') return;

    async function fetchUsers() {
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
        }
      } catch (err) {
        console.error('Failed to fetch users', err);
      }
    }
    fetchUsers();
  }, [currentUser]);

  // 4. Handlers
  const handleStatusChange = async (newStatus: string) => {
    if (!lead) return;
    setUpdatingLead(true);
    setError('');
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update status.');
      }

      // Reload lead, notes, and activity trail
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdatingLead(false);
    }
  };

  const handleAssigneeChange = async (newAssigneeId: string) => {
    if (!lead) return;
    setUpdatingLead(true);
    setError('');
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: newAssigneeId === '' ? null : newAssigneeId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to assign lead.');
      }

      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdatingLead(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setSubmittingNote(true);
    setError('');
    try {
      const res = await fetch(`/api/leads/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newNote }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save note.');
      }

      setNewNote('');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingNote(false);
    }
  };

  const getActivityText = (act: Activity) => {
    const actorName = act.actorId?.name || 'System';
    switch (act.action) {
      case 'lead_captured':
        return `Lead captured publicly from ${act.meta?.source || 'web form'}.`;
      case 'status_changed':
        return `${actorName} changed status from "${act.meta?.oldStatus}" to "${act.meta?.newStatus}".`;
      case 'lead_assigned':
        return act.meta?.newAssignedTo 
          ? `${actorName} assigned lead to user.`
          : `${actorName} unassigned the lead.`;
      case 'note_added':
        return `${actorName} added a note.`;
      default:
        return `${actorName} performed action "${act.action}".`;
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  if (loading && !lead) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  if (error && !lead) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <svg className="w-16 h-16 text-rose-500/20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h3 className="text-xl font-bold text-white mb-2">Access Denied</h3>
        <p className="text-slate-400 mb-6 max-w-sm">{error}</p>
        <Link href="/dashboard" className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors cursor-pointer">
          &larr; Back to Dashboard
        </Link>
      </div>
    );
  }

  const assignedUser = lead?.assignedTo;

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />

      {/* Navigation */}
      <nav className="relative border-b border-slate-900 bg-slate-900/40 backdrop-blur-md z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-md font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                Digital Heroes
              </span>
            </Link>
            <div className="flex items-center gap-1">
              <Link href="/dashboard" className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Leads
              </Link>
              {currentUser?.role === 'admin' && (
                <Link href="/dashboard/users" className="px-3 py-1.5 text-sm font-semibold rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition-colors">
                  Users
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-bold text-slate-200">{currentUser?.name}</span>
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">{currentUser?.role}</span>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-900/60 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Grid */}
      <main className="relative max-w-7xl w-full mx-auto px-6 py-8 flex-1 z-10 space-y-6">
        
        {/* Back Link & Error alert */}
        <div className="flex flex-col space-y-4">
          <Link href="/dashboard" className="text-sm font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors text-left">
            &larr; Back to Dashboard
          </Link>

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm flex items-center gap-2 text-left">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}
        </div>

        {lead && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column - Details Form */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-900 rounded-xl p-6 shadow-xl space-y-5 text-left">
                <h3 className="text-lg font-bold text-white">Lead Specifications</h3>
                
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Contact Name</span>
                    <span className="text-base font-bold text-white block mt-0.5">{lead.name}</span>
                  </div>

                  {/* Email */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Email Address</span>
                    <span className="text-sm text-slate-200 block mt-0.5">{lead.email}</span>
                  </div>

                  {/* Phone */}
                  {lead.phone && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Phone Number</span>
                      <span className="text-sm text-slate-200 block mt-0.5">{lead.phone}</span>
                    </div>
                  )}

                  {/* Company */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Company</span>
                    <span className="text-sm text-slate-200 block mt-0.5">{lead.company || '—'}</span>
                  </div>

                  {/* Source */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Source</span>
                    <span className="text-xs bg-slate-900 border border-slate-800/80 px-2 py-0.5 rounded text-slate-400 capitalize block w-fit mt-1">{lead.source}</span>
                  </div>

                  {/* Status update (auth-protected wrapper) */}
                  <div className="flex flex-col space-y-1.5">
                    <label htmlFor="status-select" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Pipeline Status</label>
                    <select
                      id="status-select"
                      value={lead.status}
                      disabled={updatingLead}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none transition-colors disabled:opacity-50"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="qualified">Qualified</option>
                      <option value="proposal">Proposal</option>
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                    </select>
                  </div>

                  {/* Assignee update (admin only) */}
                  <div className="flex flex-col space-y-1.5">
                    <label htmlFor="assignee-select" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Assigned Owner</label>
                    {currentUser?.role === 'admin' ? (
                      <select
                        id="assignee-select"
                        value={assignedUser?._id || ''}
                        disabled={updatingLead}
                        onChange={(e) => handleAssigneeChange(e.target.value)}
                        className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none transition-colors disabled:opacity-50"
                      >
                        <option value="">Unassigned</option>
                        {users.map((u) => (
                          <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                        ))}
                      </select>
                    ) : (
                      <div className="w-full bg-slate-950/40 border border-slate-900 rounded-lg px-3 py-2 text-sm text-slate-400">
                        {assignedUser ? `${assignedUser.name} (${assignedUser.role})` : 'Unassigned'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Notes and Activities */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Notes Card */}
              <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-900 rounded-xl p-6 shadow-xl space-y-6 text-left">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Discussion & Notes
                </h3>
                
                {/* Notes List */}
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                  {notes.length === 0 ? (
                    <span className="text-slate-600 italic text-sm block py-4">No comments or notes have been logged yet.</span>
                  ) : (
                    notes.map((note) => (
                      <div key={note._id} className="p-4 bg-slate-950/40 border border-slate-900 rounded-lg space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="font-bold text-slate-400">{note.authorId?.name || 'Unknown Author'}</span>
                          <span>{new Date(note.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-200 text-sm whitespace-pre-wrap">{note.text}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Note Form */}
                <form onSubmit={handleAddNote} className="space-y-3 border-t border-slate-900/60 pt-4">
                  <textarea
                    rows={3}
                    placeholder="Type a new update note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none transition-colors"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingNote || !newNote.trim()}
                      className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg shadow transition-colors cursor-pointer"
                    >
                      {submittingNote ? 'Saving...' : 'Add Note'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Activity Trail Card */}
              <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-900 rounded-xl p-6 shadow-xl space-y-6 text-left">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Activity Audit Trail
                </h3>
                
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                  {activities.length === 0 ? (
                    <span className="text-slate-600 italic text-sm block">No activities captured yet.</span>
                  ) : (
                    activities.map((act) => (
                      <div key={act._id} className="flex gap-4 items-start text-sm">
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-indigo-500/50 mt-1.5 flex-shrink-0" />
                        <div className="flex flex-col space-y-0.5">
                          <span className="text-slate-200">{getActivityText(act)}</span>
                          <span className="text-[10px] text-slate-500">{new Date(act.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative max-w-7xl mx-auto w-full px-6 py-6 border-t border-slate-900/60 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500 z-10">
        <div>
          &copy; {new Date().getFullYear()} Digital Heroes. All rights reserved.
        </div>
        <div className="flex items-center gap-2">
          <span>Built for</span>
          <a
            href="https://digitalheroesco.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400/80 hover:text-indigo-300 font-semibold transition-colors decoration-indigo-400/30 hover:underline"
          >
            Digital Heroes Training Task
          </a>
        </div>
      </footer>
    </div>
  );
}
