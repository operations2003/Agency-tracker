import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { SlaBadge, Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import {
  ArrowLeft,
  Briefcase,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Plus,
  ShieldCheck,
  History
} from 'lucide-react';

export const RoleDetailPage: React.FC<{
  roleId: string;
  onBack: () => void;
}> = ({ roleId, onBack }) => {
  const { user, isOwner, isManager } = useAuth();
  const [role, setRole] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Stage change modal
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [targetStage, setTargetStage] = useState('');
  const [stageNotes, setStageNotes] = useState('');

  // SLA extension modal
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [addedDays, setAddedDays] = useState('5');
  const [extensionReason, setExtensionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRole = async () => {
    setLoading(true);
    try {
      const data = await api.getRoleById(roleId);
      setRole(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRole();
  }, [roleId]);

  const stages = [
    { key: 'NEW_REQUEST', label: 'New Request' },
    { key: 'SOURCING', label: 'Sourcing' },
    { key: 'SCREENING', label: 'Screening' },
    { key: 'SHORTLISTING', label: 'Shortlisting' },
    { key: 'SHORTLIST_SUBMITTED', label: 'Shortlist Submitted' },
    { key: 'INTERVIEW', label: 'Interview' },
    { key: 'OFFER', label: 'Offer' },
    { key: 'HIRED_FILLED', label: 'Hired / Filled' }
  ];

  const handleAdvanceStage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.updateRoleStage(roleId, targetStage, stageNotes);
      setIsStageModalOpen(false);
      setStageNotes('');
      fetchRole();
    } catch (err: any) {
      alert(err.message || 'Failed to update stage');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExtendSla = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.extendSla(roleId, parseInt(addedDays, 10), extensionReason);
      setIsExtensionModalOpen(false);
      setExtensionReason('');
      fetchRole();
    } catch (err: any) {
      alert(err.message || 'Failed to extend SLA');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-400">Loading role SLA clock and pipeline history...</div>;
  }

  if (!role) {
    return (
      <div className="p-8 text-center text-sm text-rose-400">
        Role not found. <button onClick={onBack} className="text-sky-400 underline ml-2">Back to list</button>
      </div>
    );
  }

  const currentStageIndex = stages.findIndex(s => s.key === role.currentStage);
  const evalData = role.slaEvaluation;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-white tracking-tight">{role.title}</h2>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                {role.priority}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Client: <strong className="text-slate-300">{role.client?.name}</strong> • Recruiter: {role.recruiter?.name || 'Unassigned'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(isOwner || isManager) && (
            <button
              onClick={() => setIsExtensionModalOpen(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-medium transition"
            >
              Extend SLA Deadline
            </button>
          )}
          <button
            onClick={() => {
              const nextStage = stages[Math.min(stages.length - 1, currentStageIndex + 1)]?.key || role.currentStage;
              setTargetStage(nextStage);
              setIsStageModalOpen(true);
            }}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-medium transition shadow-md shadow-sky-600/30 flex items-center gap-1.5"
          >
            <span>Advance Stage</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SLA Clock Hero Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">SLA Clock State</span>
              <SlaBadge status={evalData?.slaStatus || 'ON_TRACK'} consumption={evalData?.consumptionPercentage} />
            </div>
            <h3 className="text-2xl font-bold text-white mt-1">
              {evalData?.consumptionPercentage ?? 0}% Consumed
            </h3>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400">Contractual Deadline:</span>
            <div className="text-lg font-bold font-mono text-white">
              {new Date(role.slaDeadlineDate).toLocaleDateString()}
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Policy: {role.deadlinePolicy === 'WORKING_DAYS' ? 'Working Days (9am-5pm)' : 'Calendar Days (24/7)'}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700/60">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                evalData?.isBreached
                  ? 'bg-rose-500'
                  : (evalData?.consumptionPercentage || 0) >= 90
                  ? 'bg-rose-500'
                  : (evalData?.consumptionPercentage || 0) >= 70
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, evalData?.consumptionPercentage || 0)}%` }}
            />
          </div>

          <div className="mt-3 flex justify-between text-xs text-slate-400 font-mono">
            <span>Elapsed: {evalData?.elapsedDurationHours || 0}h</span>
            <span>Remaining: {evalData?.remainingDurationHours || 0}h</span>
            <span>Total Duration: {evalData?.totalDurationHours || 0}h</span>
          </div>
        </div>
      </div>

      {/* Visual Pipeline Progression Tracker */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Hiring Pipeline Progress</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {stages.map((stage, idx) => {
            const isCompleted = currentStageIndex > idx;
            const isCurrent = currentStageIndex === idx;

            return (
              <button
                key={stage.key}
                onClick={() => {
                  setTargetStage(stage.key);
                  setIsStageModalOpen(true);
                }}
                className={`p-3 rounded-xl text-left border transition flex flex-col justify-between min-h-[75px] ${
                  isCurrent
                    ? 'bg-sky-600/20 border-sky-500 text-sky-400 shadow-sm'
                    : isCompleted
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-slate-800/40 border-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold">0{idx + 1}</span>
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : isCurrent ? (
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                  ) : null}
                </div>
                <span className="text-xs font-medium leading-snug">{stage.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid: Stage History & Logged Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stage History Audit Trail */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-white">Stage Progression History</h3>
            <span className="text-xs text-slate-400">{role.stageHistories?.length || 0} Transitions</span>
          </div>

          <div className="space-y-3">
            {role.stageHistories?.map((history: any) => (
              <div key={history.id} className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-white">
                    {history.fromStage ? `${history.fromStage} → ` : ''}
                    <strong className="text-sky-400">{history.toStage}</strong>
                  </span>
                  <span className="text-slate-400 font-mono text-[10px]">
                    {new Date(history.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-slate-400">Changed by: <span className="text-slate-200">{history.changedBy}</span></p>
                {history.notes && <p className="text-slate-300 italic">"{history.notes}"</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Time Entries Allocated to this Role */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-white">Work Logged to Role</h3>
            <span className="text-xs text-slate-400 font-mono">
              Total: {role.timeEntries?.reduce((acc: number, e: any) => acc + e.hours, 0).toFixed(1)}h
            </span>
          </div>

          <div className="space-y-2.5">
            {role.timeEntries?.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No time recorded on this recruitment search yet.</p>
            ) : (
              role.timeEntries?.map((entry: any) => (
                <div key={entry.id} className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white font-mono">{entry.taskType}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(entry.workDate).toISOString().slice(0, 10)}
                      </span>
                    </div>
                    <p className="text-slate-400 mt-0.5">{entry.recruiter?.name} • {entry.description || 'No notes'}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-white text-sm">{entry.hours}h</span>
                    <span className="block text-[10px] text-emerald-400 font-mono">{entry.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Stage Change Modal */}
      <Modal
        isOpen={isStageModalOpen}
        onClose={() => setIsStageModalOpen(false)}
        title="Update Pipeline Stage"
        subtitle={`Transitioning "${role.title}"`}
      >
        <form onSubmit={handleAdvanceStage} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">New Stage</label>
            <select
              value={targetStage}
              onChange={e => setTargetStage(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
            >
              {stages.map(s => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Transition Notes / Comments</label>
            <textarea
              value={stageNotes}
              onChange={e => setStageNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
              placeholder="e.g. Shortlist submitted to client hiring manager with 3 vetted profiles..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsStageModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-medium transition shadow-md shadow-sky-600/30"
            >
              {submitting ? 'Updating...' : 'Confirm Stage Change'}
            </button>
          </div>
        </form>
      </Modal>

      {/* SLA Extension Modal */}
      <Modal
        isOpen={isExtensionModalOpen}
        onClose={() => setIsExtensionModalOpen(false)}
        title="Grant SLA Deadline Extension"
        subtitle="Audited contract deadline extension approved by client or account manager"
      >
        <form onSubmit={handleExtendSla} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Added Days</label>
            <input
              type="number"
              value={addedDays}
              onChange={e => setAddedDays(e.target.value)}
              required
              min="1"
              max="60"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Reason for Extension</label>
            <textarea
              value={extensionReason}
              onChange={e => setExtensionReason(e.target.value)}
              required
              rows={3}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
              placeholder="Client requested revised candidate profile specifications..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsExtensionModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-medium transition shadow-md shadow-sky-600/30"
            >
              {submitting ? 'Extending...' : 'Grant Extension'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
