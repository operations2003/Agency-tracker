import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { History, Search, Filter, ShieldCheck } from 'lucide-react';

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs({ action: actionFilter || undefined });
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">System Audit Trail</h2>
          <p className="text-xs text-slate-400 mt-1">
            Immutable log of financial adjustments, time approvals, SLA extensions, and security events
          </p>
        </div>

        <select
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          className="px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-sky-500"
        >
          <option value="">All Audited Actions</option>
          <option value="USER_LOGIN">User Logins</option>
          <option value="TIME_ENTRIES_APPROVED">Time Approvals</option>
          <option value="TIME_ENTRY_ADJUSTED">Time Adjustments</option>
          <option value="CLIENT_CREATED">Client Created</option>
          <option value="SLA_EXTENDED">SLA Extensions</option>
          <option value="ALERT_RESOLVED">Alert Resolutions</option>
          <option value="SETTINGS_UPDATED">Settings Updated</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading audit records...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No audit records found matching criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Timestamp (UTC)</th>
                  <th className="py-3 px-4">Operator / Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity Type</th>
                  <th className="py-3 px-4">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {new Date(log.createdAt).toISOString()}
                    </td>
                    <td className="py-3 px-4 font-medium text-white">
                      {log.user?.name || 'System Worker'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded font-mono font-semibold bg-slate-800 text-sky-400 border border-slate-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">{log.entityType}</td>
                    <td className="py-3 px-4 text-slate-400 max-w-md font-mono text-[11px] truncate">
                      {log.details || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
