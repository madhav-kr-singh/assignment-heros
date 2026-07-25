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
    <div className="relative min-h-screen bg-[#FDFBF8] font-sans flex flex-col justify-between overflow-hidden text-ink-900 selection:bg-coral-500 selection:text-white">
      {/* Background radial gradients matching Design System page style */}
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
      <header className="relative w-full border-b border-black/5 bg-[#FDFBF8]/82 backdrop-blur-md z-10">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center">
            <img
              src="/dh-logo-light-clean.webp"
              alt="Digital Heroes"
              className="h-8 w-auto object-contain"
            />
          </div>
          <Link 
            href="/login"
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-ink-800 border border-border-strong rounded-full hover:bg-ink-50 active:bg-ink-100 transition-all duration-200 cursor-pointer"
          >
            Portal Login
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative flex flex-1 items-center justify-center px-6 py-16 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 max-w-5xl w-full items-center">
          
          {/* Left Column - Hero Text */}
          <div className="flex flex-col text-left space-y-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-coral-50 text-coral-700 border border-coral-100 w-fit uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-coral-500"></span>
              Partner with the best
            </span>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-1.02 text-ink-900">
              Grow Your Business With <span className="font-serif italic font-normal text-coral-600">Digital Solutions</span>
            </h1>
            <p className="text-ink-500 text-lg leading-relaxed max-w-md font-normal">
              Connect with our team of specialists to optimize your sales processes, integrate advanced tech pipelines, and scale operations seamlessly.
            </p>
            <div className="flex flex-col gap-4 text-sm text-ink-600 pt-4">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-coral-500" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Structured Lead Management & Assignment</span>
              </div>
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-coral-500" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Automated Activity Trails & History Logging</span>
              </div>
            </div>
          </div>

          {/* Right Column - Lead Capture Form */}
          <div className="relative">
            {/* Soft Shadow Backing */}
            <div className="absolute inset-0 bg-[#FF6B35]/5 rounded-2xl blur-2xl opacity-40 pointer-events-none" />
            
            {/* Form Card */}
            <div className="relative bg-white border border-border-token rounded-2xl p-8 shadow-md">
              {success ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 bg-success-bg text-success border border-success/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-ink-900">Inquiry Submitted!</h3>
                  <p className="text-ink-500 max-w-sm mx-auto">
                    Thank you for reaching out. A Digital Heroes specialist will review your request and get back to you shortly.
                  </p>
                  <button
                    onClick={() => setSuccess(false)}
                    className="mt-6 inline-flex items-center justify-center px-5 py-2 text-sm font-semibold text-coral-700 border border-coral-200 bg-coral-50 hover:bg-coral-100 rounded-full transition-all cursor-pointer"
                  >
                    Submit another inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1">
                    <h3 className="text-xl font-semibold text-ink-900">Get in Touch</h3>
                    <p className="text-ink-500 text-sm">Please fill out this form to connect with us.</p>
                  </div>

                  {errorMsg && (
                    <div className="p-4 bg-error-bg border border-error/20 rounded-lg text-error text-sm flex items-center gap-2">
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Name */}
                  <div className="flex flex-col text-left space-y-1.5">
                    <label htmlFor="name" className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Full Name</label>
                    <input
                      id="name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. John Doe"
                      className={`w-full bg-white border ${errors.name ? 'border-error ring-4 ring-error/15' : 'border-border-strong focus:border-coral-500 focus:ring-4 focus:ring-coral-500/18'} rounded-lg px-4 py-2.5 text-sm text-ink-900 placeholder-ink-400 focus:outline-none transition-all duration-200`}
                    />
                    {errors.name && <span className="text-error text-xs mt-1">{errors.name}</span>}
                  </div>

                  {/* Email */}
                  <div className="flex flex-col text-left space-y-1.5">
                    <label htmlFor="email" className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Email Address</label>
                    <input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="e.g. john@company.com"
                      className={`w-full bg-white border ${errors.email ? 'border-error ring-4 ring-error/15' : 'border-border-strong focus:border-coral-500 focus:ring-4 focus:ring-coral-500/18'} rounded-lg px-4 py-2.5 text-sm text-ink-900 placeholder-ink-400 focus:outline-none transition-all duration-200`}
                    />
                    {errors.email && <span className="text-error text-xs mt-1">{errors.email}</span>}
                  </div>

                  {/* Company */}
                  <div className="flex flex-col text-left space-y-1.5">
                    <label htmlFor="company" className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Company (Optional)</label>
                    <input
                      id="company"
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      placeholder="e.g. Acme Corp"
                      className="w-full bg-white border border-border-strong focus:border-coral-500 focus:ring-4 focus:ring-coral-500/18 rounded-lg px-4 py-2.5 text-sm text-ink-900 placeholder-ink-400 focus:outline-none transition-all duration-200"
                    />
                  </div>

                  {/* Phone */}
                  <div className="flex flex-col text-left space-y-1.5">
                    <label htmlFor="phone" className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Phone Number (Optional)</label>
                    <input
                      id="phone"
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="e.g. +1 555 123 4567"
                      className="w-full bg-white border border-border-strong focus:border-coral-500 focus:ring-4 focus:ring-coral-500/18 rounded-lg px-4 py-2.5 text-sm text-ink-900 placeholder-ink-400 focus:outline-none transition-all duration-200"
                    />
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
