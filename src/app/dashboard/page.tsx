'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface LeadUser {
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
  assignedTo?: LeadUser;
  createdAt: string;
}

export default function Dashboard() {
  const router = useRouter();
  
  // States
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<LeadUser[]>([]); // For assignee filter (admin only)
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 10 });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 1. Fetch Session on Mount
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

  // 2. Fetch Assignees if Admin
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

  // 3. Fetch Scoped Leads
  useEffect(() => {
    if (!currentUser) return;

    async function fetchLeads() {
      setLoading(true);
      setError('');
      try {
        const queryParams = new URLSearchParams({
          page: page.toString(),
          limit: '10',
        });

        if (search) queryParams.set('search', search);
        if (statusFilter) queryParams.set('status', statusFilter);
        if (assigneeFilter) queryParams.set('assignedTo', assigneeFilter);

        const res = await fetch(`/api/leads?${queryParams.toString()}`);
        if (!res.ok) throw new Error('Failed to retrieve leads.');
        
        const data = await res.json();
        setLeads(data.leads || []);
        setPagination({
          total: data.pagination.total,
          pages: data.pagination.pages,
          limit: data.pagination.limit,
        });
      } catch (err: any) {
        setError(err.message || 'Error loading leads.');
      } finally {
        setLoading(false);
      }
    }

    fetchLeads();
  }, [currentUser, page, search, statusFilter, assigneeFilter]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  const getStatusBadgeClass = (status: Lead['status']) => {
    switch (status) {
      case 'new':
        return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
      case 'contacted':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'qualified':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'proposal':
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
      case 'won':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'lost':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Background decoration */}
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
            <div className="hidden md:flex items-center gap-1">
              <Link href="/dashboard" className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Leads
              </Link>
              {currentUser.role === 'admin' && (
                <Link href="/dashboard/users" className="px-3 py-1.5 text-sm font-semibold rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition-colors">
                  Users
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* User Profile Info */}
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-bold text-slate-200">{currentUser.name}</span>
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">{currentUser.role}</span>
            </div>
            
            {/* Logout */}
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

      {/* Main Dashboard Container */}
      <main className="relative max-w-7xl w-full mx-auto px-6 py-8 flex-1 z-10 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-left">
            <h1 className="text-2xl font-bold text-white tracking-tight">Leads Dashboard</h1>
            <p className="text-slate-400 text-sm">Monitor sales pipelines and status updates.</p>
          </div>
          {/* Quick links for mobile */}
          <div className="md:hidden flex gap-2">
            <Link href="/dashboard" className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-900 border border-slate-800 text-indigo-400">Leads</Link>
            {currentUser.role === 'admin' && (
              <Link href="/dashboard/users" className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-900 border border-slate-800 text-slate-400">Users</Link>
            )}
          </div>
        </div>

        {/* Filters Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-slate-900/30 backdrop-blur-xl border border-slate-900 rounded-xl">
          {/* Search */}
          <div className="flex flex-col text-left space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Search Query</span>
            <input
              type="text"
              placeholder="Search name, email, company..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none transition-colors"
            />
          </div>

          {/* Status Filter */}
          <div className="flex flex-col text-left space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status Filter</span>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none transition-colors"
            >
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="proposal">Proposal</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
          </div>

          {/* Assignee Filter (Admins Only) */}
          {currentUser.role === 'admin' ? (
            <div className="flex flex-col text-left space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Assignee Filter</span>
              <select
                value={assigneeFilter}
                onChange={(e) => { setAssigneeFilter(e.target.value); setPage(1); }}
                className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none transition-colors"
              >
                <option value="">All Assignees</option>
                <option value="unassigned">Unassigned Only</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex flex-col text-left space-y-1 opacity-50">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Assignee Scoping</span>
              <div className="w-full bg-slate-950/40 border border-slate-900 rounded-lg px-3 py-2 text-sm text-slate-500">
                Assigned to you
              </div>
            </div>
          )}

          {/* Clean Filters Button */}
          <div className="flex items-end">
            <button
              onClick={() => { setSearch(''); setStatusFilter(''); setAssigneeFilter(''); setPage(1); }}
              className="w-full inline-flex items-center justify-center h-9 px-4 text-xs font-semibold text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700 hover:bg-slate-900/40 rounded-lg transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Leads Table Card */}
        <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-900 rounded-xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : error ? (
            <div className="text-center py-20 text-rose-400 text-sm flex flex-col items-center gap-2 justify-center">
              <svg className="w-12 h-12 text-rose-500/20 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-20 text-slate-500 text-sm flex flex-col items-center gap-2 justify-center">
              <svg className="w-12 h-12 text-slate-700/30 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>No leads found matching current criteria.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-slate-300">
                <thead className="bg-slate-950/40 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-900/60">
                  <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Contact Info</th>
                    <th className="px-6 py-4">Company</th>
                    <th className="px-6 py-4">Source</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Assigned To</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60">
                  {leads.map((lead) => (
                    <tr key={lead._id} className="hover:bg-slate-900/30 transition-colors duration-150 group">
                      <td className="px-6 py-4 font-bold text-white">
                        {lead.name}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span>{lead.email}</span>
                          {lead.phone && <span className="text-slate-500 text-xs mt-0.5">{lead.phone}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {lead.company || <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs bg-slate-900 border border-slate-800/80 px-2 py-0.5 rounded text-slate-400 capitalize">{lead.source}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${getStatusBadgeClass(lead.status)}`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {lead.assignedTo ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-500" />
                            <span>{lead.assignedTo.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/dashboard/leads/${lead._id}`}
                          className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer border border-indigo-500/10"
                        >
                          Details &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination Footer */}
          {!loading && leads.length > 0 && (
            <div className="px-6 py-4 bg-slate-950/20 border-t border-slate-900 flex items-center justify-between text-xs text-slate-400">
              <span>Showing {leads.length} of {pagination.total} leads</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-900/60 transition-colors cursor-pointer"
                >
                  Previous
                </button>
                <span className="font-semibold text-slate-300">Page {page} of {pagination.pages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  disabled={page === pagination.pages}
                  className="px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-900/60 transition-colors cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
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
