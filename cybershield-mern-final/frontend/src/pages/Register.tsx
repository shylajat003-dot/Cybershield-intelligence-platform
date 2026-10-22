import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldAlert, Lock, Mail, User, Shield, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const Register: React.FC = () => {
  const { register } = useAuth();
  const { error, success } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('SECURITY_ANALYST');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      error('Validation Error', 'Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password, role);
      success('Account Created', 'Registration successful! Welcome to CyberShield.');
      navigate('/dashboard');
    } catch (err: any) {
      error('Registration Failed', err.response?.data?.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-soc-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-md bg-soc-card border border-soc-border rounded-2xl shadow-2xl p-8 z-10">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="p-3 bg-blue-600 rounded-xl text-white shadow-xl shadow-blue-500/20 mb-3">
            <ShieldAlert size={30} />
          </div>
          <h1 className="text-xl font-bold font-mono text-white">ANALYST REGISTRATION</h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">Create an account on CyberShield SOC</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-mono font-medium text-slate-300 mb-1">Full Name</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Alex Vance"
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-soc-border rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-3 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="alex.vance@cybershield.io"
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-soc-border rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-slate-300 mb-1">Role Assignment</label>
            <div className="relative">
              <Shield size={16} className="absolute left-3 top-3 text-slate-500" />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-soc-border rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              >
                <option value="SECURITY_ANALYST">SECURITY_ANALYST (Investigate & Manage)</option>
                <option value="ADMIN">ADMIN (Full Access)</option>
                <option value="VIEWER">VIEWER (Read Only)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-3 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-soc-border rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-slate-300 mb-1">Confirm Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-3 text-slate-500" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-soc-border rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs rounded-lg shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            {loading ? 'CREATING ACCOUNT...' : 'REGISTER ACCOUNT'}
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-400">
            Already registered?{' '}
            <Link to="/login" className="text-blue-400 hover:underline font-mono">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

