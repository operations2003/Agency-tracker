import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import { TimeEntry } from '../types';
import { Modal } from '../components/Modal';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { CheckSquare, XCircle, CheckCircle2, AlertCircle, RefreshCw, SlidersHorizontal } from 'lucide-react';

export const TimeApprovalPage: React.FC = () => {
  const { success, error } = useToast();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Audited Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingEntry, setAdjustingEntry] = useState<TimeEntry | null>(null);
  const [adjustedHours, setAdjustedHours] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  const fetchSubmittedEntries = async () => {
    setLoading(true);
    try {
      const data = await api.getTimeEntries();
      setEntries(data);
    } catch (err: any) {
      error('Failed to Load Entries', err.message || 'Could not fetch time queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmittedEntries();
  }, []);

  const pendingEntries = entries.filter(e => e.status === 'SUBMITTED');
  const approvedEntries = entries.filter(e => e.status === 'APPROVED');

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(pendingEntries.map(e => e.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) return;
    setSubmitting(true);
    try {
      await api.batchApproveTime(selectedIds, 'APPROVE');
      success('Hours Approved', `${selectedIds.length} time entries approved into official margin calculations.`);
      setSelectedIds([]);
      fetchSubmittedEntries();
    } catch (err: any) {
      error('Batch Approval Failed', err.message || 'Batch approval failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBatchReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    setSubmitting(true);
    try {
      await api.batchApproveTime(selectedIds, 'REJECT', rejectionReason);
      setIsRejectModalOpen(false);
      success('Entries Rejected', `${selectedIds.length} entries rejected and sent back to recruiters.`);
      setSelectedIds([]);
      setRejectionReason('');
      fetchSubmittedEntries();
    } catch (err: any) {
      error('Batch Rejection Failed', err.message || 'Batch rejection failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingEntry) return;
    setSubmitting(true);
    try {
      await api.adjustTime(adjustingEntry.id, parseFloat(adjustedHours), adjustmentReason);
      setIsAdjustModalOpen(false);
      setAdjustingEntry(null);
      setAdjustmentReason('');
      success('Audited Adjustment Recorded', `Record adjusted to ${adjustedHours}h.`);
      fetchSubmittedEntries();
    } catch (err: any) {
      error('Adjustment Failed', err.message || 'Adjustment failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Time Entry Approval Queue</h2>
          <p className="text-xs text-slate-400 mt-1">
            Review and approve recruiter hours to finalize official client margin calculations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRejectModalOpen(true)}
            disabled={selectedIds.length === 0 || submitting}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-medium transition disabled:opacity-40"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Reject ({selectedIds.length})</span>
          </button>

          <button
            onClick={handleBatchApprove}
            disabled={selectedIds.length === 0 || submitting}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium transition shadow-md shadow-emerald-600/30 disabled:opacity-40"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approve Selected ({selectedIds.length})</span>
          </button>
        </div>
      </div>

      {/* Provisional vs Actuals Notice */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="text-xs text-slate-300">
            <strong className="text-amber-400 font-semibold">{pendingEntries.length} Submitted Entries Pending Review.</strong>{' '}
            Unapproved hours appear on management dashboards as <span className="font-mono text-amber-300 font-semibold">PROVISIONAL</span> costs until verified.
          </div>
        </div>
        <button
          onClick={fetchSubmittedEntries}
          className="text-xs text-amber-400 hover:underline flex items-center gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Pending Approval Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 bg-slate-850 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Pending Approval Queue</h3>
          <span className="text-xs text-slate-400 font-mono">
            {pendingEntries.reduce((acc, e) => acc + e.hours, 0).toFixed(1)}h Pending
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading pending entries...</div>
        ) : pendingEntries.length === 0 ? (
          <div className="p-8 text-center text-sm text-emerald-400 py-12 flex flex-col items-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2 opacity-80" />
            <span>Time approval queue is clear! All logged hours have been approved or processed.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedIds.length === pendingEntries.length && pendingEntries.length > 0}
                      className="w-4 h-4 rounded text-sky-600 bg-slate-800 border-slate-700 focus:ring-sky-500"
                    />
                  </th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Recruiter</th>
                  <th className="py-3 px-4">Client & Role</th>
                  <th className="py-3 px-4">Task</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {pendingEntries.map(entry => {
                  const isSelected = selectedIds.includes(entry.id);
                  return (
                    <tr
                      key={entry.id}
                      onClick={() => handleToggleSelect(entry.id)}
                      className={`hover:bg-slate-800/40 transition cursor-pointer ${
                        isSelected ? 'bg-sky-600/10' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(entry.id)}
                          className="w-4 h-4 rounded text-sky-600 bg-slate-800 border-slate-700 focus:ring-sky-500"
                        />
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                        {new Date(entry.workDate).toISOString().slice(0, 10)}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-white text-xs">
                        {entry.recruiter?.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white text-xs">{entry.client?.name}</div>
                        <div className="text-[11px] text-slate-400">{entry.role?.title || 'Account Coordination'}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                          {entry.taskType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400 max-w-xs truncate">
                        {entry.description || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-white text-sm">
                        {entry.hours}h
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historical Approved Entries Table with Adjustment Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm space-y-2">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Approved Time Entries (Official Margins)</h3>
            <p className="text-xs text-slate-400 mt-0.5">Approved historical entries require formal audited adjustments to correct</p>
          </div>
          <span className="text-xs font-mono text-emerald-400">
            {approvedEntries.reduce((acc, e) => acc + e.hours, 0).toFixed(1)}h Approved
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Recruiter</th>
                <th className="py-2.5 px-4">Client</th>
                <th className="py-2.5 px-4">Task</th>
                <th className="py-2.5 px-4">Reviewed By</th>
                <th className="py-2.5 px-4 text-right">Hours</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {approvedEntries.slice(0, 10).map(entry => (
                <tr key={entry.id} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 font-mono text-slate-300">{new Date(entry.workDate).toISOString().slice(0, 10)}</td>
                  <td className="py-2.5 px-4 font-medium text-white">{entry.recruiter?.name}</td>
                  <td className="py-2.5 px-4 text-slate-300">{entry.client?.name}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-400">{entry.taskType}</td>
                  <td className="py-2.5 px-4 text-slate-400">{entry.reviewedBy?.name || 'Manager'}</td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-white">{entry.hours}h</td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      onClick={() => {
                        setAdjustingEntry(entry);
                        setAdjustedHours(String(entry.hours));
                        setIsAdjustModalOpen(true);
                      }}
                      className="text-sky-400 hover:text-sky-300 underline font-medium"
                    >
                      Audit Adjustment
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Reject Selected Time Entries"
        subtitle={`Rejecting ${selectedIds.length} entry(s)`}
      >
        <form onSubmit={handleBatchReject} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Reason for Rejection</label>
            <textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              required
              rows={3}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-rose-500"
              placeholder="e.g. Non-billable client training logged under candidate sourcing..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsRejectModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-medium transition shadow-md shadow-rose-600/30"
            >
              {submitting ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Audited Adjustment Modal */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title="Submit Audited Time Adjustment"
        subtitle="Approved entries cannot be silently edited; an audit log entry will be created"
      >
        <form onSubmit={handleCreateAdjustment} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Adjusted Hours</label>
            <input
              type="number"
              step="0.25"
              value={adjustedHours}
              onChange={e => setAdjustedHours(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Audit Reason for Correction</label>
            <textarea
              value={adjustmentReason}
              onChange={e => setAdjustmentReason(e.target.value)}
              required
              rows={3}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
              placeholder="e.g. Recruiter double-entered client interview duration..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsAdjustModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-medium transition shadow-md shadow-sky-600/30"
            >
              {submitting ? 'Saving...' : 'Save Audited Adjustment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

