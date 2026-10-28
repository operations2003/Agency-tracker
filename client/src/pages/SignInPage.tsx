import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { ShieldAlert, ArrowRight, Lock, Mail, CheckCircle2 } from 'lucide-react';

export const SignInPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('owner@agency.io');
  const [password, setPassword] = useState('Password123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await api.login({ email, password });
      login(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
    setLoading(true);
    setError(null);
    try {
      const data = await api.login({ email: demoEmail, password: 'Password123!' });
      login(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-blue-500 shadow-xl shadow-sky-500/20 mb-4">
          <ShieldAlert className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Agency Tracker</h2>
        <p className="mt-1 text-sm text-slate-400">
          SLA Breach Prevention & Margin Leakage Defense System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900/90 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 backdrop-blur-xl">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500 transition"
                  placeholder="name@agency.io"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500 transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-medium text-sm transition shadow-lg shadow-sky-600/30 disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign in to Console'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Sign In Section */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider text-center mb-3">
              One-Click Demo Personas
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('owner@agency.io')}
                className="p-2.5 text-left rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition group"
              >
                <div className="font-semibold text-white group-hover:text-purple-400">Victoria Vance</div>
                <div className="text-[10px] text-purple-400">Agency Owner</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('manager@agency.io')}
                className="p-2.5 text-left rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition group"
              >
                <div className="font-semibold text-white group-hover:text-sky-400">Marcus Sterling</div>
                <div className="text-[10px] text-sky-400">Delivery Manager</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('recruiter1@agency.io')}
                className="p-2.5 text-left rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition group"
              >
                <div className="font-semibold text-white group-hover:text-emerald-400">Sarah Jenkins</div>
                <div className="text-[10px] text-emerald-400">Recruiter</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('finance@agency.io')}
                className="p-2.5 text-left rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition group"
              >
                <div className="font-semibold text-white group-hover:text-amber-400">Claire Bennett</div>
                <div className="text-[10px] text-amber-400">Finance Lead</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

