'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  active: boolean;
  createdAt: string;
}

export default function ManageUsers() {
  const router = useRouter();

  // Session & lists
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create User Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'member' as 'admin' | 'member',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submittingUser, setSubmittingUser] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);

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

  // 2. Fetch Users List
  async function loadUsers() {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) {
        if (res.status === 403) throw new Error('Forbidden: Admin access required.');
        throw new Error('Failed to retrieve user accounts.');
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message || 'Error loading users.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role !== 'admin') {
      setLoading(false);
      return;
    }
    loadUsers();
  }, [currentUser]);

  // 3. User Form Handler
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setError('');
    setFormSuccess(false);

    // ponytail: Custom basic UI validations
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    if (!formData.password.trim()) errors.password = 'Password is required';
    else if (formData.password.length < 6) errors.password = 'Password must be at least 6 characters';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmittingUser(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create user.');
      }

      setFormSuccess(true);
      setFormData({ name: '', email: '', password: '', role: 'member' });
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setSubmittingUser(false);
    }
  };

  // 4. Toggle User Activation Status
  const handleToggleActive = async (targetUser: User) => {
    // Prevent self-deactivation safeguard
    if (targetUser._id === currentUser?.id) {
      setError('Safety Safeguard: You cannot deactivate your own account.');
      return;
    }

    setError('');
    try {
      const res = await fetch(`/api/users/${targetUser._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !targetUser.active }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update user status.');
      }

      await loadUsers();
    } catch (err: any) {
      setError(err.message);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  // 5. Forbidden Access UI for Members
  if (currentUser && currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <svg className="w-16 h-16 text-rose-500/20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h3 className="text-xl font-bold text-white mb-2">Access Denied</h3>
        <p className="text-slate-400 mb-6 max-w-sm">You do not have administrative privileges to access this directory.</p>
        <Link href="/dashboard" className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors cursor-pointer">
          &larr; Back to Dashboard
        </Link>
      </div>
    );
  }

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
              <Link href="/dashboard" className="px-3 py-1.5 text-sm font-semibold rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition-colors">
                Leads
              </Link>
              <Link href="/dashboard/users" className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Users
              </Link>
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
        
        {/* Header Title & Error Banner */}
        <div className="flex flex-col space-y-4">
          <div className="text-left">
            <h1 className="text-2xl font-bold text-white tracking-tight">Staff Management</h1>
            <p className="text-slate-400 text-sm">Create and activate/deactivate member portal credentials.</p>
          </div>

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm flex items-center gap-2 text-left">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Create User Form */}
          <div className="lg:col-span-1">
            <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-900 rounded-xl p-6 shadow-xl text-left">
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white">Create Staff Member</h3>
                  <p className="text-slate-400 text-xs">Add a new portal user account.</p>
                </div>

                {formSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Staff account created successfully!</span>
                  </div>
                )}

                {/* Name */}
                <div className="flex flex-col space-y-1.5">
                  <label htmlFor="form-name" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Full Name</label>
                  <input
                    id="form-name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    placeholder="e.g. Sarah Connor"
                    className={`w-full bg-slate-950/60 border ${formErrors.name ? 'border-rose-500' : 'border-slate-800'} focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-700 focus:outline-none transition-colors`}
                  />
                  {formErrors.name && <span className="text-rose-400 text-xs">{formErrors.name}</span>}
                </div>

                {/* Email */}
                <div className="flex flex-col space-y-1.5">
                  <label htmlFor="form-email" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Email Address</label>
                  <input
                    id="form-email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    placeholder="e.g. sarah@digitalheroes.com"
                    className={`w-full bg-slate-950/60 border ${formErrors.email ? 'border-rose-500' : 'border-slate-800'} focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-700 focus:outline-none transition-colors`}
                  />
                  {formErrors.email && <span className="text-rose-400 text-xs">{formErrors.email}</span>}
                </div>

                {/* Password */}
                <div className="flex flex-col space-y-1.5">
                  <label htmlFor="form-password" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Password</label>
                  <input
                    id="form-password"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleFormChange}
                    placeholder="••••••••"
                    className={`w-full bg-slate-950/60 border ${formErrors.password ? 'border-rose-500' : 'border-slate-800'} focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-700 focus:outline-none transition-colors`}
                  />
                  {formErrors.password && <span className="text-rose-400 text-xs">{formErrors.password}</span>}
                </div>

                {/* Role */}
                <div className="flex flex-col space-y-1.5">
                  <label htmlFor="form-role" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Security Role</label>
                  <select
                    id="form-role"
                    name="role"
                    value={formData.role}
                    onChange={handleFormChange}
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none transition-colors"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={submittingUser}
                  className="w-full inline-flex items-center justify-center h-10 px-4 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-lg transition-all duration-200 cursor-pointer"
                >
                  {submittingUser ? 'Creating...' : 'Register User'}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column - User Accounts Table */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-900 rounded-xl overflow-hidden shadow-xl text-left">
              <div className="p-4 border-b border-slate-900/60 bg-slate-950/20">
                <h3 className="text-base font-bold text-white">Registered Users</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm text-slate-300">
                  <thead className="bg-slate-950/40 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-900/60">
                    <tr>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60">
                    {users.map((u) => (
                      <tr key={u._id} className="hover:bg-slate-900/30 transition-colors duration-150">
                        <td className="px-6 py-4 font-semibold text-white">{u.name}</td>
                        <td className="px-6 py-4">{u.email}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded capitalize border ${u.role === 'admin' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-slate-900 text-slate-400 border-slate-800'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 text-xs font-bold ${u.active ? 'text-emerald-400' : 'text-rose-400'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${u.active ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                            {u.active ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {u._id === currentUser?.id ? (
                            <span className="text-xs text-slate-600 italic">Current User</span>
                          ) : (
                            <button
                              onClick={() => handleToggleActive(u)}
                              className={`inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${u.active ? 'text-rose-400 border-rose-500/10 bg-rose-500/5 hover:bg-rose-500/10' : 'text-emerald-400 border-emerald-500/10 bg-emerald-500/5 hover:bg-emerald-500/10'}`}
                            >
                              {u.active ? 'Deactivate' : 'Activate'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

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
