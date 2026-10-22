import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldAlert, Lock, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { error, success } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(false);
    try {
      setLoading(true);
      await login(email, password);
      success('Authentication Successful', 'Welcome to CyberShield SOC Platform');
      navigate('/dashboard');
    } catch (err: any) {
      error('Authentication Failed', err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoUser = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
    >
      {/* Background decoration */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div
        className="w-full max-w-md border rounded-2xl shadow-xl overflow-hidden p-8 z-10"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div className="p-3 bg-blue-600 rounded-xl text-white shadow-xl shadow-blue-500/20 mb-3">
            <ShieldAlert size={32} />
          </div>
          <h1 className="text-xl font-bold font-mono tracking-tight" style={{ color: 'var(--text-primary)' }}>
            CYBERSHIELD INTELLIGENCE
          </h1>
          <p className="text-xs mt-1 font-mono" style={{ color: 'var(--text-secondary)' }}>
            Centralized Threat Intelligence & SOC Console
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Email Address
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-3" style={{ color: 'var(--text-muted)' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="analyst@cybershield.io"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg text-xs font-mono border focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-3" style={{ color: 'var(--text-muted)' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg text-xs font-mono border focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-mono font-bold text-xs rounded-lg shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'AUTHENTICATING...' : 'ACCESS SOC CONSOLE'}
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Demo Credentials Quick Fill */}
        <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <p className="text-[11px] font-mono font-semibold uppercase tracking-wider mb-3 text-center" style={{ color: 'var(--text-muted)' }}>
            Quick Demo Accounts
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => fillDemoUser('admin@cybershield.io', 'Admin123!')}
              className="py-1.5 px-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded text-[11px] font-mono text-red-600 font-semibold transition-colors"
            >
              ADMIN
            </button>
            <button
              onClick={() => fillDemoUser('analyst@cybershield.io', 'Analyst123!')}
              className="py-1.5 px-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded text-[11px] font-mono text-blue-600 font-semibold transition-colors"
            >
              ANALYST
            </button>
            <button
              onClick={() => fillDemoUser('viewer@cybershield.io', 'Viewer123!')}
              className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-[11px] font-mono text-slate-700 font-semibold transition-colors"
            >
              VIEWER
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Need an account?{' '}
            <Link to="/register" className="text-blue-600 hover:underline font-mono font-semibold">
              Register Analyst
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

