import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import {
  LayoutDashboard,
  Building2,
  Briefcase,
  Clock,
  CheckSquare,
  TrendingDown,
  Users,
  AlertTriangle,
  Receipt,
  FileSpreadsheet,
  FileText,
  UserCheck,
  Settings,
  History,
  User as UserIcon,
  LogOut,
  PlusCircle,
  Menu,
  X,
  Bell
} from 'lucide-react';

interface DashboardLayoutProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  children: React.ReactNode;
  onOpenQuickTimeModal: () => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  currentTab,
  setCurrentTab,
  children,
  onOpenQuickTimeModal
}) => {
  const { user, logout, isOwner, isManager, isFinance, isRecruiter } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unresolvedAlertsCount, setUnresolvedAlertsCount] = useState<number>(0);

  useEffect(() => {
    const fetchAlertCount = async () => {
      try {
        const alerts = await api.getAlerts({ status: 'OPEN' });
        setUnresolvedAlertsCount(alerts.length);
      } catch {
        // Ignore
      }
    };
    fetchAlertCount();
    const interval = setInterval(fetchAlertCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Overview Dashboard', icon: LayoutDashboard, roles: ['OWNER', 'MANAGER', 'RECRUITER', 'FINANCE'] },
    { id: 'clients', label: 'Client Directory', icon: Building2, roles: ['OWNER', 'MANAGER', 'RECRUITER', 'FINANCE'] },
    { id: 'roles', label: 'Recruitment Roles & SLA', icon: Briefcase, roles: ['OWNER', 'MANAGER', 'RECRUITER', 'FINANCE'] },
    { id: 'time', label: 'Time Tracking', icon: Clock, roles: ['OWNER', 'MANAGER', 'RECRUITER', 'FINANCE'] },
    { id: 'time-approval', label: 'Time Approvals', icon: CheckSquare, roles: ['OWNER', 'MANAGER'] },
    { id: 'margins', label: 'Client Margin Board', icon: TrendingDown, roles: ['OWNER', 'MANAGER', 'FINANCE'] },
    { id: 'workload', label: 'Recruiter Workload', icon: Users, roles: ['OWNER', 'MANAGER'] },
    { id: 'alerts', label: 'Alert Center', icon: AlertTriangle, roles: ['OWNER', 'MANAGER', 'RECRUITER', 'FINANCE'], badge: unresolvedAlertsCount },
    { id: 'billing', label: 'Billing & Reconciliation', icon: Receipt, roles: ['OWNER', 'FINANCE'] },
    { id: 'csv', label: 'CSV Import & Export', icon: FileSpreadsheet, roles: ['OWNER', 'MANAGER', 'FINANCE', 'RECRUITER'] },
    { id: 'reports', label: 'Reports & Summary', icon: FileText, roles: ['OWNER', 'MANAGER', 'FINANCE'] },
    { id: 'users', label: 'User & Permissions', icon: UserCheck, roles: ['OWNER'] },
    { id: 'settings', label: 'Business Rule Settings', icon: Settings, roles: ['OWNER'] },
    { id: 'audit', label: 'Audit Trail', icon: History, roles: ['OWNER', 'FINANCE'] },
    { id: 'profile', label: 'Account Profile', icon: UserIcon, roles: ['OWNER', 'MANAGER', 'RECRUITER', 'FINANCE'] }
  ];

  const filteredNavItems = navItems.filter(item => user && item.roles.includes(user.role));

  const roleBadgeColors: Record<string, string> = {
    OWNER: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    MANAGER: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    RECRUITER: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    FINANCE: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center font-bold text-white shadow-lg shadow-sky-600/30">
            A
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-white leading-none">Apex Agency</h1>
            <p className="text-[10px] text-sky-400 font-mono mt-0.5">SLA & Margin Tracker</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenQuickTimeModal}
            className="p-2 rounded-lg bg-sky-600 text-white hover:bg-sky-500 transition shadow-sm"
            title="Log Time"
          >
            <PlusCircle className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Sidebar for Desktop & Mobile Overlay */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900/95 border-r border-slate-800 flex flex-col transition-transform duration-200 backdrop-blur-md md:static md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center font-extrabold text-white text-lg shadow-md shadow-sky-500/20">
              AT
            </div>
            <div>
              <h2 className="font-bold text-base tracking-tight text-white leading-none">Agency Tracker</h2>
              <p className="text-xs text-sky-400 mt-1">SLA & Margin Defense</p>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Log Action */}
        <div className="p-4 border-b border-slate-800/60">
          <button
            onClick={() => {
              onOpenQuickTimeModal();
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-xl font-medium text-sm shadow-md shadow-sky-600/20 transition-all duration-150"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Fast Time Entry</span>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredNavItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sky-600/15 text-sky-400 border border-sky-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Footer Profile */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-semibold text-sm">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'U'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
              <span
                className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-mono border mt-0.5 ${
                  user ? roleBadgeColors[user.role] : ''
                }`}
              >
                {user?.role}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <header className="hidden md:flex items-center justify-between px-8 py-4 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white capitalize">
              {navItems.find(i => i.id === currentTab)?.label || 'Dashboard'}
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              Live Monitoring
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentTab('alerts')}
              className="relative p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <Bell className="w-5 h-5" />
              {unresolvedAlertsCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-slate-900" />
              )}
            </button>
            <div className="h-6 w-px bg-slate-800" />
            <span className="text-xs text-slate-400">
              Logged in as <strong className="text-slate-200">{user?.name}</strong> ({user?.role})
            </span>
          </div>
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
          {children}
        </div>
      </main>
    </div>
  );
};
