import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Branding */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-600 mb-4 shadow-lg shadow-brand-900">
            <span className="text-white font-black text-2xl">AA</span>
          </div>
          <h1 className="text-white font-bold text-2xl">Agent Advantage</h1>
          <p className="text-slate-400 text-sm mt-1">Real Estate Analytics Platform</p>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-700 p-8 shadow-2xl">
          <h2 className="text-white font-semibold text-lg mb-6">Sign In</h2>

          {error && (
            <div className="bg-rose-950/50 border border-rose-700/50 text-rose-400 text-sm px-4 py-3 rounded-lg mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@agentadvantage.com"
                className="w-full bg-slate-800 border border-slate-600 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-slate-800 border border-slate-600 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-colors text-sm"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-700">
            <p className="text-slate-500 text-xs text-center mb-3">Demo credentials:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <DemoBtn
                label="Broker"
                email="broker@agentadvantage.com"
                password="broker2024!"
                onClick={(e, p) => { setEmail(e); setPassword(p); }}
              />
              <DemoBtn
                label="Agent"
                email="james@agentadvantage.com"
                password="agent2024!"
                onClick={(e, p) => { setEmail(e); setPassword(p); }}
              />
            </div>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          © 2024 Agent Advantage · All rights reserved
        </p>
      </div>
    </div>
  );
}

function DemoBtn({ label, email, password, onClick }: {
  label: string; email: string; password: string;
  onClick: (email: string, password: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(email, password)}
      className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 text-xs py-2 px-3 rounded-lg transition-colors text-left"
    >
      <div className="font-medium">{label}</div>
      <div className="text-slate-500 truncate">{email}</div>
    </button>
  );
}
