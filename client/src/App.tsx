import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SignInPage } from './pages/SignInPage';
import { DashboardLayout } from './layouts/DashboardLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ClientListPage } from './pages/ClientListPage';
import { ClientDetailPage } from './pages/ClientDetailPage';
import { RoleListPage } from './pages/RoleListPage';
import { RoleDetailPage } from './pages/RoleDetailPage';
import { TimeEntryPage } from './pages/TimeEntryPage';
import { TimeApprovalPage } from './pages/TimeApprovalPage';
import { MarginBoardPage } from './pages/MarginBoardPage';
import { WorkloadBoardPage } from './pages/WorkloadBoardPage';
import { AlertCenterPage } from './pages/AlertCenterPage';
import { BillingReconciliationPage } from './pages/BillingReconciliationPage';
import { CsvImportPage } from './pages/CsvImportPage';
import { ReportsPage } from './pages/ReportsPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { BusinessRulesSettingsPage } from './pages/BusinessRulesSettingsPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { ProfilePage } from './pages/ProfilePage';
import { Modal } from './components/Modal';
import { api } from './api/client';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  // Global Quick Log Time Modal
  const [isQuickTimeModalOpen, setIsQuickTimeModalOpen] = useState(false);
  const [quickClientId, setQuickClientId] = useState('');
  const [quickRoleId, setQuickRoleId] = useState('');
  const [quickTaskType, setQuickTaskType] = useState('SOURCING');
  const [quickHours, setQuickHours] = useState('2.5');
  const [quickDescription, setQuickDescription] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [quickSubmitting, setQuickSubmitting] = useState(false);

  const openQuickTime = async () => {
    setIsQuickTimeModalOpen(true);
    try {
      const [cData, rData] = await Promise.all([api.getClients(), api.getRoles()]);
      setClients(cData);
      setRoles(rData);
      if (cData.length > 0 && !quickClientId) setQuickClientId(cData[0].id);
    } catch {
      // Ignore
    }
  };

  const handleQuickTimeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickSubmitting(true);
    try {
      await api.createTimeEntry({
        clientId: quickClientId,
        roleId: quickRoleId || undefined,
        taskType: quickTaskType,
        workDate: new Date().toISOString().slice(0, 10),
        hours: parseFloat(quickHours),
        isBillable: true,
        description: quickDescription,
        status: 'SUBMITTED'
      });
      setIsQuickTimeModalOpen(false);
      setQuickDescription('');
      alert('Time entry submitted successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to submit time');
    } finally {
      setQuickSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <span>Verifying session security...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <SignInPage />;
  }

  const renderActiveScreen = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentTab} />;

      case 'clients':
        if (selectedClientId) {
          return (
            <ClientDetailPage
              clientId={selectedClientId}
              onBack={() => setSelectedClientId(null)}
              onSelectRole={(rId) => {
                setSelectedRoleId(rId);
                setCurrentTab('roles');
              }}
            />
          );
        }
        return <ClientListPage onSelectClient={(cId) => setSelectedClientId(cId)} />;

      case 'roles':
        if (selectedRoleId) {
          return (
            <RoleDetailPage
              roleId={selectedRoleId}
              onBack={() => setSelectedRoleId(null)}
            />
          );
        }
        return <RoleListPage onSelectRole={(rId) => setSelectedRoleId(rId)} />;

      case 'time':
        return <TimeEntryPage />;

      case 'time-approval':
        return <TimeApprovalPage />;

      case 'margins':
        return <MarginBoardPage />;

      case 'workload':
        return <WorkloadBoardPage />;

      case 'alerts':
        return <AlertCenterPage />;

      case 'billing':
        return <BillingReconciliationPage />;

      case 'csv':
        return <CsvImportPage />;

      case 'reports':
        return <ReportsPage />;

      case 'users':
        return <UserManagementPage />;

      case 'settings':
        return <BusinessRulesSettingsPage />;

      case 'audit':
        return <AuditLogPage />;

      case 'profile':
        return <ProfilePage />;

      default:
        return <DashboardPage onNavigate={setCurrentTab} />;
    }
  };

  return (
    <DashboardLayout
      currentTab={currentTab}
      setCurrentTab={(tab) => {
        setSelectedClientId(null);
        setSelectedRoleId(null);
        setCurrentTab(tab);
      }}
      onOpenQuickTimeModal={openQuickTime}
    >
      {renderActiveScreen()}

      {/* Global Fast Time Entry Modal */}
      <Modal
        isOpen={isQuickTimeModalOpen}
        onClose={() => setIsQuickTimeModalOpen(false)}
        title="Fast Time Entry Logging"
        subtitle="Quick-log candidate calls, screening, or sourcing hours"
      >
        <form onSubmit={handleQuickTimeSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Client Account</label>
              <select
                value={quickClientId}
                onChange={e => setQuickClientId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
              >
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Recruitment Role</label>
              <select
                value={quickRoleId}
                onChange={e => setQuickRoleId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
              >
                <option value="">General Client Time</option>
                {roles.filter(r => !quickClientId || r.clientId === quickClientId).map(r => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Task Type</label>
              <select
                value={quickTaskType}
                onChange={e => setQuickTaskType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
              >
                <option value="SOURCING">Sourcing</option>
                <option value="SCREENING">Screening</option>
                <option value="CANDIDATE_CALL">Candidate Call</option>
                <option value="INTERVIEW">Interview</option>
                <option value="CLIENT_MEETING">Client Meeting</option>
                <option value="COORDINATION">Coordination</option>
                <option value="REPORTING">Reporting</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Hours Logged</label>
              <input
                type="number"
                step="0.25"
                min="0.25"
                max="24"
                value={quickHours}
                onChange={e => setQuickHours(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Work Description / Notes</label>
            <textarea
              value={quickDescription}
              onChange={e => setQuickDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
              placeholder="Summary of sourcing, screening, or interview activities..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsQuickTimeModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={quickSubmitting}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-medium transition shadow-md shadow-sky-600/30"
            >
              {quickSubmitting ? 'Logging...' : 'Submit Entry'}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

