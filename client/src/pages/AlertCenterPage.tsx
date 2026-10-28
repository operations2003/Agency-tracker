import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import { Alert } from '../types';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { CardSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  Send,
  MessageSquare,
  Filter,
  CheckSquare,
  Clock
} from 'lucide-react';

export const AlertCenterPage: React.FC = () => {
  const { isOwner, isManager } = useAuth();
  const { success, error, info } = useToast();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'OPEN' | 'RESOLVED' | ''>('OPEN');
  const [typeFilter, setTypeFilter] = useState('');
  const [scanning, setScanning] = useState(false);

  // Resolve Modal
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const data = await api.getAlerts({
        status: statusFilter || undefined,
        type: typeFilter || undefined
      });
      setAlerts(data);
    } catch (err: any) {
      error('Failed to Load Alerts', err.message || 'Could not fetch alerts stream.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [statusFilter, typeFilter]);

  const handleScanClocks = async () => {
    setScanning(true);
    try {
      const res = await api.scanSlaAlerts();
      success('Risk Scan Finished', `Analyzed active roles. ${res?.createdAlerts?.length || 0} alerts evaluated.`);
      fetchAlerts();
    } catch (err: any) {
      error('Scan Failed', err.message || 'Risk engine scan failed.');
    } finally {
      setScanning(false);
    }
  };

  const handleResolveAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlert) return;
    setSubmitting(true);
    try {
      await api.resolveAlert(selectedAlert.id, resolutionNotes);
      setSelectedAlert(null);
      setResolutionNotes('');
      success('Risk Alert Resolved', `Alert closed and logged to audit trail.`);
      fetchAlerts();
    } catch (err: any) {
      error('Resolution Failed', err.message || 'Failed to resolve alert');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReopenAlert = async (id: string) => {
    try {
      await api.reopenAlert(id);
      info('Alert Reopened', 'Risk alert set back to ACTIVE status.');
      fetchAlerts();
    } catch (err: any) {
      error('Failed to Reopen', err.message || 'Failed to reopen alert');
    }
  };

  const handleTestDispatch = async (alertId: string) => {
    try {
      const res = await api.testDispatchAlert(alertId, 'SLACK');
      success(
        'Webhook Dispatched',
        `Slack notification: ${res.dispatchResult.slackSuccess ? '✓ Delivered' : 'Failed'}`
      );
      fetchAlerts();
    } catch (err: any) {
      error('Dispatch Failed', err.message || 'Notification webhook failed.');
    }
  };

  const openCount = alerts.filter(a => a.status === 'OPEN').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Alert Center & Risk Engine</h2>
            {openCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white animate-pulse">
                {openCount} Active
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Rules 1–4 automated risk alerts, deduplicated event logs, and resolution management
          </p>
        </div>

        <button
          onClick={handleScanClocks}
          disabled={scanning}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
          <span>{scanning ? 'Scanning Clocks...' : 'Run Scheduled Risk Scan'}</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1 text-xs">
          <button
            onClick={() => setStatusFilter('OPEN')}
            className={`px-4 py-1.5 rounded-lg font-medium transition ${
              statusFilter === 'OPEN'
                ? 'bg-rose-500/20 text-rose-300 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Active Open Risks
          </button>
          <button
            onClick={() => setStatusFilter('RESOLVED')}
            className={`px-4 py-1.5 rounded-lg font-medium transition ${
              statusFilter === 'RESOLVED'
                ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Resolved History
          </button>
          <button
            onClick={() => setStatusFilter('')}
            className={`px-4 py-1.5 rounded-lg font-medium transition ${
              statusFilter === ''
                ? 'bg-sky-500/20 text-sky-300 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Alerts
          </button>
        </div>

        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-sky-500"
        >
          <option value="">All 4 Business Rules</option>
          <option value="AMBER_SLA">Rule 1 — Amber SLA Warning (≥70%)</option>
          <option value="RED_SLA">Rule 2 — Red SLA / Breach (≥90%)</option>
          <option value="LOW_MARGIN">Rule 3 — Low Margin Warning</option>
          <option value="RECRUITER_OVERLOAD">Rule 4 — Recruiter Overload</option>
        </select>
      </div>

      {/* Alerts Stream List */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : alerts.length === 0 ? (
          <EmptyState
            title="No alerts currently active"
            description="All candidate SLA clocks and client profit margins are safely within operational thresholds."
            icon={<CheckCircle2 className="w-8 h-8 text-emerald-400 opacity-80" />}
          />
        ) : (
          alerts.map(alert => (
            <div
              key={alert.id}
              className={`p-5 rounded-2xl bg-slate-900 border transition-all ${
                alert.status === 'RESOLVED'
                  ? 'border-slate-800/80 opacity-75'
                  : alert.severity === 'CRITICAL'
                  ? 'border-rose-500/50 shadow-lg shadow-rose-950/20 bg-gradient-to-r from-rose-950/20 to-slate-900'
                  : 'border-amber-500/40 shadow-lg shadow-amber-950/10'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                      alert.severity === 'CRITICAL'
                        ? 'bg-rose-500/20 text-rose-400'
                        : alert.severity === 'WARNING'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-sky-500/20 text-sky-400'
                    }`}
                  >
                    <AlertTriangle className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{alert.triggerRule}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                          alert.severity === 'CRITICAL'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {alert.severity}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mt-1.5">{alert.message}</p>

                    <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-400 font-mono">
                      <span>Detected: {new Date(alert.detectedAt).toLocaleString()}</span>
                      {alert.client && <span>• Client: {alert.client.name}</span>}
                      {alert.role && <span>• Role: {alert.role.title}</span>}
                    </div>

                    {alert.resolutionNotes && (
                      <div className="mt-3 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
                        <span className="text-emerald-400 font-semibold">
                          Resolved by {alert.resolvedBy?.name || 'Manager'} on {new Date(alert.resolvedAt!).toLocaleString()}:
                        </span>
                        <p className="text-slate-300 italic mt-0.5">"{alert.resolutionNotes}"</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => handleTestDispatch(alert.id)}
                    className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                    title="Send Test Slack / Email Alert"
                  >
                    <Send className="w-4 h-4" />
                  </button>

                  {alert.status === 'OPEN' ? (
                    <button
                      onClick={() => {
                        setSelectedAlert(alert);
                        setResolutionNotes('');
                      }}
                      className="px-3.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-medium transition"
                    >
                      Resolve Alert
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReopenAlert(alert.id)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs rounded-lg"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Resolution Modal */}
      <Modal
        isOpen={!!selectedAlert}
        onClose={() => setSelectedAlert(null)}
        title="Resolve Risk Alert"
        subtitle={`Resolving ${selectedAlert?.triggerRule}`}
      >
        <form onSubmit={handleResolveAlert} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Resolution Audit Notes (Required)
            </label>
            <textarea
              value={resolutionNotes}
              onChange={e => setResolutionNotes(e.target.value)}
              required
              rows={3}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
              placeholder="e.g. Conducted emergency candidate pipeline review with team and submitted 3 qualified candidates..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setSelectedAlert(null)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition shadow-md shadow-emerald-600/30"
            >
              {submitting ? 'Resolving...' : 'Confirm Resolution'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

