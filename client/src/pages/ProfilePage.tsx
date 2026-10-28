import React from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Shield, Building2, Bell, Lock } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Account Profile & Notification Preferences</h2>
        <p className="text-xs text-slate-400 mt-1">
          Review your authorized operational scope, role permissions, and notification channels
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Identity Profile Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-blue-700 flex items-center justify-center font-bold text-white text-lg">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'U'}
            </div>
            <div>
              <h3 className="font-bold text-base text-white">{user?.name}</h3>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Assigned Agency Role:</span>
              <span className="font-mono font-semibold text-sky-400">{user?.role}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Professional Title:</span>
              <span className="text-white">{user?.title || 'Staff Member'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Tenant / Organization:</span>
              <span className="text-white">{user?.organizationName || 'Apex Talent Global'}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Session Security:</span>
              <span className="text-emerald-400 font-mono">JWT Authenticated (24h)</span>
            </div>
          </div>
        </div>

        {/* Assigned Client Scope */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Authorized Client Scope</h3>
            <span className="text-xs text-slate-400 font-mono">
              {user?.role === 'OWNER' || user?.role === 'FINANCE' ? 'Agency-Wide' : `${user?.assignedClients?.length || 0} Accounts`}
            </span>
          </div>

          {user?.role === 'OWNER' || user?.role === 'FINANCE' ? (
            <p className="text-xs text-purple-300 leading-relaxed">
              Your role provides agency-wide administrative access to all client accounts, financial margin reports, contract rate overrides, and audit trails.
            </p>
          ) : user?.assignedClients && user.assignedClients.length > 0 ? (
            <div className="space-y-2">
              {user.assignedClients.map((client: any) => (
                <div key={client.id} className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">{client.name}</span>
                  <span className="font-mono text-sky-400 text-[10px]">{client.code}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">No specific client accounts currently assigned.</p>
          )}
        </div>
      </div>
    </div>
  );
};
