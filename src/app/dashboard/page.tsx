'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Dropdown from '@/app/components/Dropdown';

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
        return 'bg-ink-50 text-ink-600 border border-ink-200';
      case 'contacted':
        return 'bg-info-bg text-info border border-info/20';
      case 'qualified':
        return 'bg-warning-bg text-warning border border-warning/20';
      case 'proposal':
        return 'bg-coral-50 text-coral-700 border border-coral-100';
      case 'won':
        return 'bg-success-bg text-success border border-success/20';
      case 'lost':
        return 'bg-error-bg text-error border border-error/20';
      default:
        return 'bg-ink-50 text-ink-500 border border-ink-200';
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#FDFBF8] flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-coral-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

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
            <div className="hidden md:flex items-center gap-1.5">
              <Link href="/dashboard" className="px-3.5 py-1.5 text-sm font-semibold rounded-full bg-coral-50 text-coral-700 border border-coral-100">
                Leads
              </Link>
              {currentUser.role === 'admin' && (
                <Link href="/dashboard/users" className="px-3.5 py-1.5 text-sm font-medium rounded-full text-ink-500 hover:text-ink-800 hover:bg-ink-50 transition-colors">
                  Users
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* User Profile Info */}
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-bold text-ink-800">{currentUser.name}</span>
              <span className="text-xs font-semibold text-coral-600 uppercase tracking-widest">{currentUser.role}</span>
            </div>
            
            {/* Logout */}
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

      {/* Main Dashboard Container */}
      <main className="relative max-w-7xl w-full mx-auto px-6 py-8 flex-1 z-10 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-left">
            <h1 className="text-2xl font-bold text-ink-900 tracking-tight">Leads Dashboard</h1>
            <p className="text-ink-500 text-sm">Monitor sales pipelines and status updates.</p>
          </div>
          {/* Quick links for mobile */}
          <div className="md:hidden flex gap-2">
            <Link href="/dashboard" className="px-3 py-1.5 text-xs font-semibold rounded-full bg-coral-50 border border-coral-100 text-coral-700">Leads</Link>
            {currentUser.role === 'admin' && (
              <Link href="/dashboard/users" className="px-3 py-1.5 text-xs font-semibold rounded-full bg-white border border-border-strong text-ink-600">Users</Link>
            )}
          </div>
        </div>

        {/* Filters Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-bg-soft border border-border-token rounded-xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
          {/* Search */}
          <div className="flex flex-col text-left space-y-1">
            <span className="text-[10px] font-bold text-ink-400 uppercase tracking-widest">Search Query</span>
            <input
              type="text"
              placeholder="Search name, email, company..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-white border border-border-strong rounded-lg px-3 py-2 text-sm text-ink-900 placeholder-ink-400 focus:border-coral-500 focus:ring-4 focus:ring-coral-500/18 focus:outline-none transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="flex flex-col text-left space-y-1">
            <span className="text-[10px] font-bold text-ink-400 uppercase tracking-widest">Status Filter</span>
            <Dropdown
              label="FILTER BY STATUS"
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'new', label: 'New' },
                { value: 'contacted', label: 'Contacted' },
                { value: 'qualified', label: 'Qualified' },
                { value: 'proposal', label: 'Proposal' },
                { value: 'won', label: 'Won' },
                { value: 'lost', label: 'Lost' }
              ]}
              value={statusFilter}
              onChange={(val) => { setStatusFilter(val); setPage(1); }}
              id="status-select"
            />
          </div>

          {/* Assignee Filter (Admins Only) */}
          {currentUser.role === 'admin' ? (
            <div className="flex flex-col text-left space-y-1">
              <span className="text-[10px] font-bold text-ink-400 uppercase tracking-widest">Assignee Filter</span>
              <Dropdown
                label="FILTER BY ASSIGNEE"
                options={[
                  { value: '', label: 'All Assignees' },
                  { value: 'unassigned', label: 'Unassigned Only' },
                  ...users.map((u) => ({ value: u._id, label: `${u.name} (${u.role})` }))
                ]}
                value={assigneeFilter}
                onChange={(val) => { setAssigneeFilter(val); setPage(1); }}
                id="assignee-select"
              />
            </div>
          ) : (
            <div className="flex flex-col text-left space-y-1 opacity-60">
              <span className="text-[10px] font-bold text-ink-400 uppercase tracking-widest">Assignee Scoping</span>
              <div className="w-full bg-white/60 border border-border-strong rounded-lg px-3 py-2.5 text-sm text-ink-400">
                Assigned to you
              </div>
            </div>
          )}

          {/* Clean Filters Button */}
          <div className="flex items-end">
            <button
              onClick={() => { setSearch(''); setStatusFilter(''); setAssigneeFilter(''); setPage(1); }}
              className="w-full inline-flex items-center justify-center h-9.5 px-4 text-xs font-semibold text-ink-700 border border-border-strong hover:bg-white active:bg-ink-150 rounded-full transition-all cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Leads Table Card */}
        <div className="bg-white border border-border-token rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <svg className="animate-spin h-8 w-8 text-coral-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : error ? (
            <div className="text-center py-20 text-error text-sm flex flex-col items-center gap-2 justify-center">
              <svg className="w-12 h-12 text-error/20 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-20 text-ink-400 text-sm flex flex-col items-center gap-2 justify-center">
              <svg className="w-12 h-12 text-ink-300/35 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>No leads found matching current criteria.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-ink-700">
                <thead className="bg-bg-soft text-xs font-bold text-ink-500 uppercase tracking-wider border-b border-border-token">
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
                <tbody className="divide-y divide-border-token">
                  {leads.map((lead) => (
                    <tr key={lead._id} className="hover:bg-bg-soft/30 transition-colors duration-150 group">
                      <td className="px-6 py-4 font-bold text-ink-900">
                        {lead.name}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span>{lead.email}</span>
                          {lead.phone && <span className="text-ink-400 text-xs mt-0.5">{lead.phone}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {lead.company || <span className="text-ink-300">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs bg-bg-soft border border-border-token px-2.5 py-0.5 rounded-full text-ink-600 capitalize font-medium">{lead.source}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize ${getStatusBadgeClass(lead.status)}`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {lead.assignedTo ? (
                          <div className="flex items-center gap-1.5 text-ink-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-coral-500" />
                            <span>{lead.assignedTo.name}</span>
                          </div>
                        ) : (
                          <span className="text-ink-400 italic text-xs">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/dashboard/leads/${lead._id}`}
                          className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold text-ink-800 bg-white hover:bg-ink-50 rounded-full transition-colors cursor-pointer border border-border-strong"
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
            <div className="px-6 py-4 bg-bg-soft border-t border-border-token flex items-center justify-between text-xs text-ink-500">
              <span>Showing {leads.length} of {pagination.total} leads</span>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3.5 py-1.5 rounded-full border border-border-strong bg-white text-ink-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-ink-50 transition-colors cursor-pointer font-medium"
                >
                  Previous
                </button>
                <span className="font-semibold text-ink-800">Page {page} of {pagination.pages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  disabled={page === pagination.pages}
                  className="px-3.5 py-1.5 rounded-full border border-border-strong bg-white text-ink-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-ink-50 transition-colors cursor-pointer font-medium"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="relative w-full border-t border-border-token bg-bg-soft z-10">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-ink-500">
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
        </div>
      </footer>
    </div>
  );
}
