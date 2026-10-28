import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import { Modal } from '../components/Modal';
import { SlaBadge } from '../components/Badge';
import { CardSkeleton, TableSkeleton } from '../components/LoadingSkeleton';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  DollarSign,
  Plus,
  Briefcase,
  History,
  Receipt
} from 'lucide-react';

export const ClientDetailPage: React.FC<{
  clientId: string;
  onBack: () => void;
  onSelectRole: (roleId: string) => void;
}> = ({ clientId, onBack, onSelectRole }) => {
  const { isOwner, isFinance } = useAuth();
  const { success, error } = useToast();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isNewTermModalOpen, setIsNewTermModalOpen] = useState(false);

  // New Term Form
  const [billingModel, setBillingModel] = useState<'RETAINER' | 'HOURLY' | 'PER_HIRE'>('RETAINER');
  const [billingRate, setBillingRate] = useState('15000');
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [slaPenaltyPercentage, setSlaPenaltyPercentage] = useState('5.0');
  const [termNotes, setTermNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchClient = async () => {
    setLoading(true);
    try {
      const data = await api.getClientById(clientId);
      setClient(data);
      if (data.contractTerms?.[0]) {
        setBillingModel(data.contractTerms[0].billingModel);
        setBillingRate(String(data.contractTerms[0].billingRate));
      }
    } catch (err: any) {
      error('Failed to Load Client', err.message || 'Could not fetch client contract details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClient();
  }, [clientId]);

  const handleCreateTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createContractTerm(clientId, {
        billingModel,
        billingRate: parseFloat(billingRate),
        effectiveFrom,
        slaPenaltyPercentage: parseFloat(slaPenaltyPercentage),
        notes: termNotes
      });
      setIsNewTermModalOpen(false);
      success('Contract Term Updated', `Applied ${billingModel} rate of $${billingRate}.`);
      fetchClient();
    } catch (err: any) {
      error('Failed to Add Contract Term', err.message || 'Could not save contract term override.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 animate-pulse" />
          <div className="space-y-2">
            <div className="w-48 h-6 bg-slate-800 rounded animate-pulse" />
            <div className="w-32 h-3 bg-slate-800/60 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <TableSkeleton rows={4} cols={5} />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8 text-center text-sm text-rose-400">
        Client account not found. <button onClick={onBack} className="text-sky-400 underline ml-2">Back to list</button>
      </div>
    );
  }

  const activeTerm = client.contractTerms?.[0];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-white tracking-tight">{client.name}</h2>
              <span className="text-xs px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 font-mono">
                {client.code}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Timezone: {client.timeZone} • Margin Safety Warning: &lt; {client.marginWarningThreshold}%
            </p>
          </div>
        </div>

        {(isOwner || isFinance) && (
          <button
            onClick={() => setIsNewTermModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Contract Term Override</span>
          </button>
        )}
      </div>

      {/* Grid: Contract & SLA Policies */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active Contract Terms */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Contract Terms</h4>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              Active
            </span>
          </div>

          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Billing Model:</span>
              <span className="font-semibold text-white font-mono">{activeTerm?.billingModel || client.billingModel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Applicable Rate:</span>
              <span className="font-semibold text-white font-mono">
                ${activeTerm?.billingRate?.toLocaleString() || '0'}{' '}
                <span className="text-xs text-slate-400">{client.currency}</span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Effective Date:</span>
              <span className="text-slate-300 font-mono">
                {activeTerm ? new Date(activeTerm.effectiveFrom).toISOString().slice(0, 10) : 'Standard'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">SLA Penalty Clause:</span>
              <span className="text-rose-400 font-mono">{activeTerm?.slaPenaltyPercentage || 0}% Fee Penalty</span>
            </div>
          </div>
        </div>

        {/* SLA Policy Baseline */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Contractual SLA Policy</h4>
            <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
              Policy
            </span>
          </div>

          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Target Duration:</span>
              <span className="font-semibold text-white font-mono">
                {client.slaPolicy?.defaultTargetDays || 14} Days
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Deadline Rule:</span>
              <span className="text-slate-300">
                {client.deadlinePolicy === 'WORKING_DAYS' ? 'Working Days (Excludes Weekends)' : 'Calendar Days (24/7)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Shortlist Milestone:</span>
              <span className="text-slate-300 font-mono">
                {client.slaPolicy?.shortlistStageTarget || 'SHORTLIST_SUBMITTED'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Pause On Hold:</span>
              <span className="text-emerald-400 font-mono">{client.slaPolicy?.pauseOnHold ? 'Yes (Clock Paused)' : 'No'}</span>
            </div>
          </div>
        </div>

        {/* Account Team */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Assigned Delivery Team</h4>
            <span className="text-xs text-slate-400">{client.assignments?.length || 0} Members</span>
          </div>

          <div className="space-y-2">
            {client.assignments?.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between py-1.5 text-xs">
                <div>
                  <span className="font-semibold text-white">{a.user.name}</span>
                  <span className="text-slate-400 ml-1.5 text-[11px] font-mono">({a.user.role})</span>
                </div>
                <span className="text-slate-400">{a.user.email}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recruitment Roles Under this Client */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-semibold text-white">Recruitment Roles & Searches</h3>
            <p className="text-xs text-slate-400 mt-0.5">Active and historical searches for {client.name}</p>
          </div>
          <span className="text-xs text-slate-400">{client.roles?.length || 0} Total Roles</span>
        </div>

        <div className="divide-y divide-slate-800/60">
          {client.roles?.map((role: any) => (
            <div
              key={role.id}
              onClick={() => onSelectRole(role.id)}
              className="py-3.5 flex items-center justify-between hover:bg-slate-800/40 px-3 rounded-xl transition cursor-pointer group"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-white group-hover:text-sky-400 transition">
                    {role.title}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    {role.currentStage}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Recruiter: {role.recruiter?.name || 'Unassigned'} • Received: {new Date(role.requestReceivedDate).toISOString().slice(0, 10)}
                </p>
              </div>

              <div className="text-right">
                <span className={`text-xs font-mono font-medium ${role.isBreached ? 'text-rose-400' : 'text-emerald-400'}`}>
                  Deadline: {new Date(role.slaDeadlineDate).toISOString().slice(0, 10)}
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Status: <strong>{role.status}</strong>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contract Terms History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-sm font-semibold text-white">Effective-Dated Contract Term History</h3>
          <p className="text-xs text-slate-400 mt-0.5">Audit trail of contractual rates without overwriting historical records</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Effective From</th>
                <th className="py-2.5 px-3">Effective To</th>
                <th className="py-2.5 px-3">Billing Model</th>
                <th className="py-2.5 px-3">Contract Rate</th>
                <th className="py-2.5 px-3">Penalty %</th>
                <th className="py-2.5 px-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {client.contractTerms?.map((term: any) => (
                <tr key={term.id}>
                  <td className="py-2.5 px-3 font-mono text-white">
                    {new Date(term.effectiveFrom).toISOString().slice(0, 10)}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-400">
                    {term.effectiveTo ? new Date(term.effectiveTo).toISOString().slice(0, 10) : 'Current Active'}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-300">{term.billingModel}</td>
                  <td className="py-2.5 px-3 font-mono font-medium text-emerald-400">
                    ${term.billingRate.toLocaleString()} {term.currency}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-rose-400">{term.slaPenaltyPercentage}%</td>
                  <td className="py-2.5 px-3 text-slate-400">{term.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Contract Term Override Modal */}
      <Modal
        isOpen={isNewTermModalOpen}
        onClose={() => setIsNewTermModalOpen(false)}
        title="Add Effective-Dated Contract Term Override"
        subtitle="Historical reports will use historical rates; future calculations will use this effective rate"
      >
        <form onSubmit={handleCreateTerm} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Billing Model</label>
              <select
                value={billingModel}
                onChange={e => setBillingModel(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
              >
                <option value="RETAINER">Retainer</option>
                <option value="HOURLY">Hourly Billable</option>
                <option value="PER_HIRE">Per Hire</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">New Rate ($)</label>
              <input
                type="number"
                step="0.01"
                value={billingRate}
                onChange={e => setBillingRate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Effective From Date</label>
              <input
                type="date"
                value={effectiveFrom}
                onChange={e => setEffectiveFrom(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">SLA Penalty Clause (%)</label>
              <input
                type="number"
                step="0.1"
                value={slaPenaltyPercentage}
                onChange={e => setSlaPenaltyPercentage(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Reason / Notes for Rate Change</label>
            <input
              type="text"
              value={termNotes}
              onChange={e => setTermNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
              placeholder="Annual contractual rate indexation or renegotiation"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsNewTermModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-medium transition shadow-md shadow-sky-600/30"
            >
              {submitting ? 'Saving...' : 'Save New Term'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

