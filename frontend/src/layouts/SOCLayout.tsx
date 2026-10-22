import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Shield, LayoutDashboard, AlertTriangle, Bug, Server, Bell, Radio,
  FileText, Activity, LogOut, Search, Menu, X, ShieldAlert, Crosshair, User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GlobalSearchModal } from '../components/GlobalSearchModal';
import { ThemeSelector } from '../components/ThemeSelector';

interface NavGroup {
  groupName: string;
  items: {
    label: string;
    path: string;
    icon: React.ElementType;
    adminOnly?: boolean;
  }[];
}

export const SOCLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const navGroups: NavGroup[] = [
    {
      groupName: 'OVERVIEW',
      items: [
        { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      groupName: 'SECURITY OPERATIONS',
      items: [
        { label: 'Threat Intelligence', path: '/threats', icon: Shield },
        { label: 'Incidents', path: '/incidents', icon: AlertTriangle },
        { label: 'Security Alerts', path: '/alerts', icon: Bell },
      ],
    },
    {
      groupName: 'RISK MANAGEMENT',
      items: [
        { label: 'Vulnerabilities', path: '/vulnerabilities', icon: Bug },
        { label: 'Monitored Assets', path: '/assets', icon: Server },
      ],
    },
    {
      groupName: 'INTELLIGENCE',
      items: [
        { label: 'Threat Sources', path: '/sources', icon: Radio },
        { label: 'Attack Techniques', path: '/attack-techniques', icon: Crosshair },
      ],
    },
    {
      groupName: 'ANALYTICS',
      items: [
        { label: 'Reports', path: '/reports', icon: FileText },
      ],
    },
    {
      groupName: 'ADMINISTRATION',
      items: [
        { label: 'Audit Logs', path: '/audit-logs', icon: Activity, adminOnly: true },
      ],
    },
  ];

  const roleStyles: Record<string, string> = {
    ADMIN: 'bg-red-50 text-red-700 border-red-200',
    SECURITY_ANALYST: 'bg-blue-50 text-blue-700 border-blue-200',
    VIEWER: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Get user initials for avatar
  const getInitials = (name?: string) => {
    if (!name) return 'CS';
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div
      className="min-h-screen flex flex-col font-sans antialiased selection:bg-blue-500 selection:text-white"
      style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
    >
      {/* Top Header */}
      <header
        className="h-16 sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 border-b shadow-xs"
        style={{ backgroundColor: 'var(--nav-bg)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <ShieldAlert size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-slate-900 font-sans">
                  CYBERSHIELD
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                  Enterprise
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-sans leading-none hidden sm:block">
                Security Operations &amp; Threat Intelligence Platform
              </p>
            </div>
          </div>
        </div>

        {/* Global Search Bar & User Actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-xs font-sans transition-all border shadow-xs hover:border-slate-300"
            style={{
              backgroundColor: 'var(--input-bg)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-secondary)',
            }}
          >
            <Search size={15} className="text-slate-400" />
            <span className="hidden sm:inline font-normal">Search threats, IOCs, CVEs, assets...</span>
            <kbd className="hidden md:inline px-1.5 py-0.5 text-[10px] rounded border bg-slate-100 border-slate-200 text-slate-500 font-mono font-medium">Ctrl+K</kbd>
          </button>

          {/* Theme Selector */}
          <ThemeSelector />

          {/* User Profile */}
          <div className="flex items-center gap-3 border-l pl-4 border-slate-200">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-sans font-bold text-xs flex items-center justify-center shadow-xs">
              {getInitials(user?.name)}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-xs font-semibold text-slate-900 font-sans leading-snug">{user?.name || 'Security Analyst'}</p>
              <p className="text-[11px] text-slate-500 leading-none">{user?.email || 'analyst@cybershield.io'}</p>
            </div>
            <span className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${roleStyles[user?.role || 'VIEWER']}`}>
              {user?.role}
            </span>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-200 transform border-r shadow-xs ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
          style={{ backgroundColor: 'var(--sidebar-bg)', borderColor: 'var(--border-color)' }}
        >
          <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-200">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-sans">NAVIGATION</span>
            <button onClick={() => setSidebarOpen(false)} className="text-slate-500 hover:text-slate-800">
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
            {navGroups.map((group) => {
              const visibleItems = group.items.filter(item => !item.adminOnly || user?.role === 'ADMIN');
              if (visibleItems.length === 0) return null;

              return (
                <div key={group.groupName} className="space-y-1">
                  <div className="px-3 py-1 text-[11px] font-bold font-sans uppercase tracking-wider text-slate-400">
                    {group.groupName}
                  </div>
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-sans font-medium transition-all ${
                            isActive
                              ? 'bg-blue-50 text-blue-600 font-semibold border border-blue-100 shadow-xs'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                          }`
                        }
                      >
                        <Icon size={18} className="shrink-0" />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              );
            })}
          </nav>

          {/* System Telemetry Footer */}
          <div className="p-3 border-t border-slate-200 text-xs font-sans bg-slate-50 text-slate-600">
            <div className="flex items-center justify-between mb-1 font-medium">
              <span className="flex items-center gap-1.5 text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                SYSTEM ONLINE
              </span>
              <span className="text-[11px] text-slate-400">v1.0.0</span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">MongoDB Atlas Connected</p>
          </div>
        </aside>

        {/* Main Workspace Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
};