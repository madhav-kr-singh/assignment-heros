'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Dropdown from '@/app/components/Dropdown';

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
      <div className="min-h-screen bg-[#FDFBF8] flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-coral-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  if (error && !lead) {
    return (
      <div className="min-h-screen bg-[#FDFBF8] text-ink-900 flex flex-col items-center justify-center p-6 text-center">
        <svg className="w-16 h-16 text-error/20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h3 className="text-xl font-semibold text-ink-900 mb-2">Access Denied</h3>
        <p className="text-ink-500 mb-6 max-w-sm">{error}</p>
        <Link href="/dashboard" className="px-5 py-2 text-sm font-semibold text-white bg-coral-500 hover:bg-coral-600 rounded-full transition-all cursor-pointer shadow-[0_8px_24px_-6px_rgba(255,107,53,0.45)]">
          &larr; Back to Dashboard
        </Link>
      </div>
    );
  }

  const assignedUser = lead?.assignedTo;

  return (
    <div className="relative min-h-screen bg-[#FDFBF8] text-ink-900 flex flex-col justify-between selection:bg-coral-500 selection:text-white">
      {/* Background decoration */}
      <div 
        className="absolute inset-0 pointer-events-none z-0" 
        style={{
          background: `
            radial-gradient(45% 45% at 85% 15%, rgba(255,138,82,0.08), transparent 65%),
            radial-gradient(40% 40% at 15% 85%, rgba(255,196,150,0.06), transparent 65%)
          `
        }} 
      />

      {/* Navigation */}
      <nav className="relative border-b border-black/5 bg-white/82 backdrop-blur-md z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="w-7.5 h-7.5 rounded-lg bg-gradient-to-br from-coral-400 to-coral-600 flex items-center justify-center text-white shadow-[0_4px_10px_-2px_rgba(255,107,53,0.45)]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z" />
                </svg>
              </span>
              <span className="text-md font-bold tracking-tight text-ink-900">
                Digital Heroes<span className="text-coral-500">.</span>
              </span>
            </Link>
            <div className="flex items-center gap-1.5">
              <Link href="/dashboard" className="px-3.5 py-1.5 text-sm font-semibold rounded-full bg-coral-50 text-coral-700 border border-coral-100">
                Leads
              </Link>
              {currentUser?.role === 'admin' && (
                <Link href="/dashboard/users" className="px-3.5 py-1.5 text-sm font-medium rounded-full text-ink-500 hover:text-ink-800 hover:bg-ink-50 transition-colors">
                  Users
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-bold text-ink-800">{currentUser?.name}</span>
              <span className="text-xs font-semibold text-coral-600 uppercase tracking-widest">{currentUser?.role}</span>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center p-2 text-ink-400 hover:text-error rounded-full hover:bg-ink-50 transition-colors cursor-pointer"
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
          <Link href="/dashboard" className="text-sm font-semibold text-ink-500 hover:text-ink-900 flex items-center gap-1.5 transition-colors text-left">
            &larr; Back to Dashboard
          </Link>

          {error && (
            <div className="p-4 bg-error-bg border border-error/20 rounded-lg text-error text-sm flex items-center gap-2 text-left">
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
              <div className="bg-white border border-border-token rounded-xl p-6 shadow-sm space-y-5 text-left">
                <h3 className="text-lg font-semibold text-ink-900">Lead Specifications</h3>
                
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <span className="text-[10px] font-bold text-ink-400 uppercase tracking-widest block">Contact Name</span>
                    <span className="text-base font-bold text-ink-900 block mt-0.5">{lead.name}</span>
                  </div>

                  {/* Email */}
                  <div>
                    <span className="text-[10px] font-bold text-ink-400 uppercase tracking-widest block">Email Address</span>
                    <span className="text-sm text-ink-800 block mt-0.5">{lead.email}</span>
                  </div>

                  {/* Phone */}
                  {lead.phone && (
                    <div>
                      <span className="text-[10px] font-bold text-ink-400 uppercase tracking-widest block">Phone Number</span>
                      <span className="text-sm text-ink-800 block mt-0.5">{lead.phone}</span>
                    </div>
                  )}

                  {/* Company */}
                  <div>
                    <span className="text-[10px] font-bold text-ink-400 uppercase tracking-widest block">Company</span>
                    <span className="text-sm text-ink-800 block mt-0.5">{lead.company || '—'}</span>
                  </div>

                  {/* Source */}
                  <div>
                    <span className="text-[10px] font-bold text-ink-400 uppercase tracking-widest block">Source</span>
                    <span className="text-xs bg-bg-soft border border-border-token px-2.5 py-0.5 rounded-full text-ink-600 capitalize block w-fit mt-1.5 font-medium">{lead.source}</span>
                  </div>

                  {/* Status update */}
                  <div className="flex flex-col space-y-1.5">
                    <label htmlFor="status-select" className="text-[10px] font-bold text-ink-400 uppercase tracking-widest block">Pipeline Status</label>
                    <Dropdown
                      label="PIPELINE STATUS"
                      options={[
                        { value: 'new', label: 'New' },
                        { value: 'contacted', label: 'Contacted' },
                        { value: 'qualified', label: 'Qualified' },
                        { value: 'proposal', label: 'Proposal' },
                        { value: 'won', label: 'Won' },
                        { value: 'lost', label: 'Lost' }
                      ]}
                      value={lead.status}
                      disabled={updatingLead}
                      onChange={handleStatusChange}
                      id="status-select"
                    />
                  </div>

                  {/* Assignee update (admin only) */}
                  <div className="flex flex-col space-y-1.5">
                    <label htmlFor="assignee-select" className="text-[10px] font-bold text-ink-400 uppercase tracking-widest block">Assigned Owner</label>
                    {currentUser?.role === 'admin' ? (
                      <Dropdown
                        label="ASSIGNED OWNER"
                        options={[
                          { value: '', label: 'Unassigned' },
                          ...users.map((u) => ({ value: u._id, label: `${u.name} (${u.role})` }))
                        ]}
                        value={assignedUser?._id || ''}
                        disabled={updatingLead}
                        onChange={handleAssigneeChange}
                        id="assignee-select"
                      />
                    ) : (
                      <div className="w-full bg-white border border-border-strong rounded-lg px-3 py-2 text-sm text-ink-500">
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
              <div className="bg-white border border-border-token rounded-xl p-6 shadow-sm space-y-6 text-left">
                <h3 className="text-lg font-semibold text-ink-900 flex items-center gap-2.5">
                  <svg className="w-5 h-5 text-coral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Discussion & Notes
                </h3>
                
                {/* Notes List */}
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                  {notes.length === 0 ? (
                    <span className="text-ink-400 italic text-sm block py-4">No comments or notes have been logged yet.</span>
                  ) : (
                    notes.map((note) => (
                      <div key={note._id} className="p-4 bg-bg-soft/40 border border-border-token rounded-lg space-y-2">
                        <div className="flex items-center justify-between text-xs text-ink-500">
                          <span className="font-semibold text-ink-700">{note.authorId?.name || 'Unknown Author'}</span>
                          <span>{new Date(note.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-ink-800 text-sm whitespace-pre-wrap">{note.text}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Note Form */}
                <form onSubmit={handleAddNote} className="space-y-3 border-t border-border-token pt-4">
                  <textarea
                    rows={3}
                    placeholder="Type a new update note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="w-full bg-white border border-border-strong focus:border-coral-500 focus:ring-4 focus:ring-coral-500/18 rounded-lg px-3 py-2 text-sm text-ink-900 placeholder-ink-400 focus:outline-none transition-all duration-200"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingNote || !newNote.trim()}
                      className="px-5 py-2 text-xs font-semibold text-white bg-coral-500 hover:bg-coral-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-full shadow-[0_4px_10px_-2px_rgba(255,107,53,0.45)] transition-all cursor-pointer font-medium"
                    >
                      {submittingNote ? 'Saving...' : 'Add Note'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Activity Trail Card */}
              <div className="bg-white border border-border-token rounded-xl p-6 shadow-sm space-y-6 text-left">
                <h3 className="text-lg font-semibold text-ink-900 flex items-center gap-2.5">
                  <svg className="w-5 h-5 text-coral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Activity Audit Trail
                </h3>
                
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                  {activities.length === 0 ? (
                    <span className="text-ink-400 italic text-sm block">No activities captured yet.</span>
                  ) : (
                    activities.map((act) => (
                      <div key={act._id} className="flex gap-4 items-start text-sm">
                        <div className="w-2.5 h-2.5 rounded-full bg-white border border-coral-500 mt-1.5 flex-shrink-0" />
                        <div className="flex flex-col space-y-0.5">
                          <span className="text-ink-800">{getActivityText(act)}</span>
                          <span className="text-[10px] text-ink-400">{new Date(act.createdAt).toLocaleString()}</span>
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
      <footer className="relative max-w-7xl mx-auto w-full px-6 py-6 border-t border-border-token flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-ink-500 z-10 bg-bg-soft">
        <div>
          &copy; {new Date().getFullYear()} Digital Heroes. All rights reserved.
        </div>
        <div className="flex items-center gap-2">
          <span>Built for</span>
          <a
            href="https://digitalheroesco.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-coral-600 hover:text-coral-700 font-semibold transition-colors decoration-coral-600/30 hover:underline"
          >
            Digital Heroes Training Task
          </a>
        </div>
      </footer>
    </div>
  );
}
