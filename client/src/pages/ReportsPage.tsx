import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { CardSkeleton, TableSkeleton } from '../components/LoadingSkeleton';
import {
  FileText,
  Send,
  Download,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  DollarSign
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { success, error } = useToast();
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recipientEmails, setRecipientEmails] = useState('management@agency.io');
  const [dispatching, setDispatching] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await api.getWeeklyReport();
      setReportData(data);
    } catch (err: any) {
      error('Failed to Load Report', err.message || 'Could not compile weekly report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleSendWeekly = async () => {
    setDispatching(true);
    try {
      await api.sendWeeklyReport(recipientEmails);
      success('Report Dispatched', `Executive weekly summary sent to: ${recipientEmails}`);
    } catch (err: any) {
      error('Dispatch Failed', err.message || 'Dispatch failed');
    } finally {
      setDispatching(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <TableSkeleton rows={4} cols={5} />
      </div>
    );
  }

  const summary = reportData?.summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Executive Management Reports</h2>
          <p className="text-xs text-slate-400 mt-1">
            Weekly automated KPI summaries, margin leakage warnings, and SLA performance digests
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={recipientEmails}
            onChange={e => setRecipientEmails(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
            placeholder="management@agency.io"
          />
          <button
            onClick={handleSendWeekly}
            disabled={dispatching}
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-medium transition shadow-md shadow-sky-600/30 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{dispatching ? 'Dispatching...' : 'Send Weekly Digest'}</span>
          </button>
        </div>
      </div>

      {/* Report Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 uppercase font-semibold">Recognized Revenue</span>
          <div className="text-xl font-bold font-mono text-white mt-1">
            ${summary?.totalRecognizedRevenue?.toLocaleString() || 0}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 uppercase font-semibold">Direct Cost</span>
          <div className="text-xl font-bold font-mono text-slate-300 mt-1">
            ${summary?.totalDirectCost?.toLocaleString() || 0}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 uppercase font-semibold">Gross Profit</span>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            ${summary?.totalProfit?.toLocaleString() || 0}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 uppercase font-semibold">Agency Margin</span>
          <div className="text-xl font-bold font-mono text-sky-400 mt-1">
            {summary?.agencyMarginPercentage !== null ? `${summary?.agencyMarginPercentage}%` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Formatted Report Preview */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Weekly Summary Digest Preview</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Period: {summary?.periodStart?.slice(0, 10)} to {summary?.periodEnd?.slice(0, 10)}
            </p>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
            Ready to Dispatch
          </span>
        </div>

        {/* Data Quality Warning */}
        {summary?.dataQualityWarning?.hasUnapprovedHours && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{summary.dataQualityWarning.message}</span>
          </div>
        )}

        {/* Lowest Margin Clients */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Accounts with Lowest Profit Margins
          </h4>
          <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl overflow-hidden">
            {summary?.lowestMarginClients?.map((client: any, idx: number) => (
              <div key={idx} className="p-3 flex items-center justify-between text-xs bg-slate-950/40">
                <div>
                  <span className="font-semibold text-white">{client.clientName}</span>
                  <span className="text-slate-400 ml-2 font-mono">({client.billingModel})</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Revenue: ${client.revenue.toLocaleString()} • Direct Labor Cost: ${client.cost.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-amber-400">
                    {client.marginPercentage !== null ? `${client.marginPercentage}% Margin` : 'N/A'}
                  </span>
                  <span className="block text-[10px] text-slate-500">{client.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SLA Status Summary */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Contractual SLA Health & Compliance
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase">Active Clocks</span>
              <div className="text-lg font-bold text-white mt-0.5">{summary?.slaSummary?.totalActiveRoles}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-800">
              <span className="text-amber-400 text-[10px] uppercase">Amber Warnings (≥70%)</span>
              <div className="text-lg font-bold text-amber-400 mt-0.5">{summary?.slaSummary?.amberWarningsCount}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-800">
              <span className="text-rose-400 text-[10px] uppercase">Red Warnings (≥90%)</span>
              <div className="text-lg font-bold text-rose-400 mt-0.5">{summary?.slaSummary?.redWarningsCount}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-800">
              <span className="text-rose-500 text-[10px] uppercase font-bold">Contractual Breaches</span>
              <div className="text-lg font-bold text-rose-500 mt-0.5">{summary?.slaSummary?.breachedCount}</div>
            </div>
          </div>
        </div>

        {/* Recruiter Overload */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Recruiter Overload Warnings
          </h4>
          {summary?.recruiterOverloadSummary?.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No recruiters currently exceeding workload thresholds.</p>
          ) : (
            <div className="space-y-2">
              {summary?.recruiterOverloadSummary?.map((rec: any, idx: number) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 flex justify-between text-xs">
                  <div>
                    <span className="font-semibold text-white">{rec.recruiterName}</span>
                    <p className="text-slate-400 mt-0.5">
                      {rec.openRoleCount} open roles • {rec.weeklyHours}h recorded this week
                    </p>
                  </div>
                  <span className="font-mono text-rose-400 font-bold">{rec.utilizationPercentage}% Capacity</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

