'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createLeadSchema } from '@/lib/validations/lead';

export default function Home() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    source: 'landing_page',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
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

    const validation = createLeadSchema.safeParse(formData);
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
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit lead.');
      }

      setSuccess(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        source: 'landing_page',
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-950 font-sans flex flex-col justify-between overflow-hidden text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/20 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="relative max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <svg className="w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-300">
            Digital Heroes
          </span>
        </div>
        <Link 
          href="/login"
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-slate-200 border border-slate-800 rounded-lg hover:border-slate-700 hover:bg-slate-900 transition-all duration-200 cursor-pointer"
        >
          Portal Login
        </Link>
      </header>

      {/* Main Content */}
      <main className="relative flex flex-1 items-center justify-center px-6 py-12 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl w-full items-center">
          
          {/* Left Column - Hero Text */}
          <div className="flex flex-col text-left space-y-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 w-fit">
              Partner with the best
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-br from-white via-slate-100 to-slate-400">
              Grow Your Business With Digital Solutions
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed max-w-md">
              Connect with our team of specialists to optimize your processes, integrate advanced AI pipelines, and scale operations seamlessly.
            </p>
            <div className="flex flex-col gap-4 text-sm text-slate-400 pt-4">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Structured Lead Management & Assignment</span>
              </div>
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Automated Activity Trails & History Logging</span>
              </div>
            </div>
          </div>

          {/* Right Column - Lead Capture Form */}
          <div className="relative">
            {/* Glow backing */}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur-xl opacity-20 pointer-events-none" />
            
            {/* Form Card */}
            <div className="relative bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
              {success ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-white">Inquiry Submitted!</h3>
                  <p className="text-slate-400 max-w-sm mx-auto">
                    Thank you for reaching out. A Digital Heroes specialist will review your request and get back to you shortly.
                  </p>
                  <button
                    onClick={() => setSuccess(false)}
                    className="mt-6 inline-flex items-center justify-center px-5 py-2 text-sm font-semibold text-indigo-400 border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 rounded-lg transition-all cursor-pointer"
                  >
                    Submit another inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-white">Get in Touch</h3>
                    <p className="text-slate-400 text-sm">Please fill out this form to connect with us.</p>
                  </div>

                  {errorMsg && (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm flex items-center gap-2">
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Name */}
                  <div className="flex flex-col text-left space-y-1.5">
                    <label htmlFor="name" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Full Name</label>
                    <input
                      id="name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. John Doe"
                      className={`w-full bg-slate-950/60 border ${errors.name ? 'border-rose-500' : 'border-slate-800'} focus:border-indigo-500 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition-colors duration-200`}
                    />
                    {errors.name && <span className="text-rose-400 text-xs mt-1">{errors.name}</span>}
                  </div>

                  {/* Email */}
                  <div className="flex flex-col text-left space-y-1.5">
                    <label htmlFor="email" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Email Address</label>
                    <input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="e.g. john@company.com"
                      className={`w-full bg-slate-950/60 border ${errors.email ? 'border-rose-500' : 'border-slate-800'} focus:border-indigo-500 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition-colors duration-200`}
                    />
                    {errors.email && <span className="text-rose-400 text-xs mt-1">{errors.email}</span>}
                  </div>

                  {/* Company */}
                  <div className="flex flex-col text-left space-y-1.5">
                    <label htmlFor="company" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Company (Optional)</label>
                    <input
                      id="company"
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      placeholder="e.g. Acme Corp"
                      className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition-colors duration-200"
                    />
                  </div>

                  {/* Phone */}
                  <div className="flex flex-col text-left space-y-1.5">
                    <label htmlFor="phone" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Phone Number (Optional)</label>
                    <input
                      id="phone"
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="e.g. +1 555 123 4567"
                      className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition-colors duration-200"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex items-center justify-center h-11 px-5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-lg hover:shadow-indigo-500/10 transition-all duration-200 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Submitting...
                      </span>
                    ) : (
                      'Submit Inquiry'
                    )}
                  </button>
                </form>
              )}
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
