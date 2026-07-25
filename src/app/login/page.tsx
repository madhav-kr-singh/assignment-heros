'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loginSchema } from '@/lib/validations/auth';

export default function Login() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setErrorMsg('');

    const validation = loginSchema.safeParse(formData);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((err: any) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Authentication failed');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#FDFBF8] font-sans flex flex-col justify-between overflow-hidden text-ink-900 selection:bg-coral-500 selection:text-white">
      {/* Background radial gradients */}
      <div 
        className="absolute inset-0 pointer-events-none z-0" 
        style={{
          background: `
            radial-gradient(55% 55% at 78% 22%, rgba(255,138,82,0.14), transparent 65%),
            radial-gradient(40% 40% at 10% 80%, rgba(255,196,150,0.1), transparent 65%)
          `
        }} 
      />

      {/* Header */}
      <header className="relative max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between z-10 border-b border-black/5 bg-[#FDFBF8]/82 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="w-7.5 h-7.5 rounded-lg bg-gradient-to-br from-coral-400 to-coral-600 flex items-center justify-center text-white shadow-[0_4px_10px_-2px_rgba(255,107,53,0.45)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z" />
            </svg>
          </span>
          <span className="text-xl font-bold tracking-tight text-ink-900">
            Digital Heroes<span className="text-coral-500">.</span>
          </span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="relative flex flex-1 items-center justify-center px-6 py-12 z-10">
        <div className="relative w-full max-w-md">
          {/* Soft Shadow Backing */}
          <div className="absolute inset-0 bg-[#FF6B35]/5 rounded-2xl blur-2xl opacity-40 pointer-events-none" />

          {/* Login Card */}
          <div className="relative bg-white border border-border-token rounded-2xl p-8 shadow-md">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1 text-center">
                <h2 className="text-2xl font-bold text-ink-900">Staff Portal</h2>
                <p className="text-ink-500 text-sm">Please log in to manage your leads.</p>
              </div>

              {errorMsg && (
                <div className="p-4 bg-error-bg border border-error/20 rounded-lg text-error text-sm flex items-center gap-2">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Email */}
              <div className="flex flex-col text-left space-y-1.5">
                <label htmlFor="email" className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Email Address</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="e.g. admin@digitalheroes.com"
                  className={`w-full bg-white border ${errors.email ? 'border-error ring-4 ring-error/15' : 'border-border-strong focus:border-coral-500 focus:ring-4 focus:ring-coral-500/18'} rounded-lg px-4 py-2.5 text-sm text-ink-900 placeholder-ink-400 focus:outline-none transition-all duration-200`}
                />
                {errors.email && <span className="text-error text-xs mt-1">{errors.email}</span>}
              </div>

              {/* Password */}
              <div className="flex flex-col text-left space-y-1.5">
                <label htmlFor="password" className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Password</label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`w-full bg-white border ${errors.password ? 'border-error ring-4 ring-error/15' : 'border-border-strong focus:border-coral-500 focus:ring-4 focus:ring-coral-500/18'} rounded-lg px-4 py-2.5 text-sm text-ink-900 placeholder-ink-400 focus:outline-none transition-all duration-200`}
                />
                {errors.password && <span className="text-error text-xs mt-1">{errors.password}</span>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center h-11 px-5 text-sm font-semibold text-white bg-coral-500 hover:bg-coral-600 active:bg-coral-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-full shadow-[0_8px_24px_-6px_rgba(255,107,53,0.45)] hover:shadow-[0_12px_30px_-6px_rgba(240,84,35,0.5)] transition-all duration-200 cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing In...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          </div>
        </div>
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
