import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { MarginResult } from '../types';
import { MarginBadge, Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import {
  TrendingDown,
  ArrowUpDown,
  Filter,
  Download,
  AlertTriangle,
  Info,
  Calendar,
  CheckCircle2,
  DollarSign
} from 'lucide-react';

export const MarginBoardPage: React.FC = () => {
  const [margins, setMargins] = useState<MarginResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'margin' | 'revenue' | 'profit' | 'cost'>('margin');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [billingModelFilter, setBillingModelFilter] = useState('');

  // Drilldown modal
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [drilldownData, setDrilldownData] = useState<any>(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  const fetchMargins = async () => {
    setLoading(true);
    try {
      const data = await api.getClientMargins({
        sortBy,
        order: sortOrder
      });
      setMargins(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMargins();
  }, [sortBy, sortOrder]);

  const handleOpenDrilldown = async (clientId: string) => {
    setSelectedClientId(clientId);
    setDrilldownLoading(true);
    try {
      const data = await api.getClientDrilldown(clientId);
      setDrilldownData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setDrilldownLoading(false);
    }
  };

  const filteredMargins = margins.filter(m => !billingModelFilter || m.billingModel === billingModelFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Client Margin Board</h2>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic revenue recognition, direct labor cost allocation, and margin leakage warnings
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={billingModelFilter}
            onChange={e => setBillingModelFilter(e.target.value)}
            className="px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-sky-500"
          >
            <option value="">All Billing Models</option>
            <option value="RETAINER">Retainer</option>
            <option value="HOURLY">Hourly Billable</option>
            <option value="PER_HIRE">Per Hire Contingency</option>
          </select>

          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={e => {
              const [sb, so] = e.target.value.split('-');
              setSortBy(sb as any);
              setSortOrder(so as any);
            }}
            className="px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-sky-500"
          >
            <option value="margin-asc">Lowest Margin (Risk First)</option>
            <option value="margin-desc">Highest Margin</option>
            <option value="profit-asc">Lowest Gross Profit</option>
            <option value="profit-desc">Highest Gross Profit</option>
            <option value="revenue-desc">Highest Revenue</option>
            <option value="cost-desc">Highest Direct Cost</option>
          </select>
        </div>
      </div>

      {/* Margins Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Calculating real-time client margins...</div>
        ) : filteredMargins.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No client records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Billing Model</th>
                  <th className="py-3 px-4 text-right">Recognized Revenue</th>
                  <th className="py-3 px-4 text-right">Direct Labor Cost</th>
                  <th className="py-3 px-4 text-right">Gross Profit</th>
                  <th className="py-3 px-4">Profit Margin %</th>
                  <th className="py-3 px-4">Data Completeness</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredMargins.map(item => (
                  <tr
                    key={item.clientId}
                    onClick={() => handleOpenDrilldown(item.clientId)}
                    className="hover:bg-slate-800/40 transition cursor-pointer group"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-xs group-hover:text-sky-400 transition">
                          {item.clientName}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700 font-mono">
                          {item.clientCode}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                      {item.billingModel}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-medium text-white">
                      ${item.totalRevenue.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                      ${item.directCost.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold">
                      <span className={item.profit < 0 ? 'text-rose-400' : 'text-emerald-400'}>
                        ${item.profit.toLocaleString()}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <MarginBadge status={item.marginStatus} marginPct={item.profitMarginPercentage} />
                    </td>

                    <td className="py-3.5 px-4">
                      {item.isProvisional ? (
                        <span className="text-xs text-amber-400 flex items-center gap-1 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Provisional ({item.unapprovedHours}h pending)</span>
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Actuals (100% Approved)</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDrilldown(item.clientId);
                        }}
                        className="text-xs text-sky-400 hover:underline font-medium"
                      >
                        Drilldown
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drilldown Modal */}
      <Modal
        isOpen={!!selectedClientId}
        onClose={() => {
          setSelectedClientId(null);
          setDrilldownData(null);
        }}
        title={`Margin Breakdown: ${drilldownData?.summary?.clientName || 'Loading...'}`}
        subtitle="Source time allocations, labor rates, and revenue reconciliation"
        maxWidth="xl"
      >
        {drilldownLoading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading client financial breakdown...</div>
        ) : drilldownData ? (
          <div className="space-y-5">
            {/* Summary Stat Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-800 border border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Recognized Revenue</span>
                <div className="text-lg font-bold font-mono text-white mt-0.5">
                  ${drilldownData.summary.totalRevenue.toLocaleString()}
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{drilldownData.summary.billingModel}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-800 border border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Direct Labor Cost</span>
                <div className="text-lg font-bold font-mono text-white mt-0.5">
                  ${drilldownData.summary.directCost.toLocaleString()}
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {drilldownData.summary.approvedHours}h approved labor
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-800 border border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Profit Margin %</span>
                <div className="text-lg font-bold font-mono text-white mt-0.5">
                  {drilldownData.summary.profitMarginPercentage !== null
                    ? `${drilldownData.summary.profitMarginPercentage}%`
                    : 'N/A (Zero Rev)'}
                </div>
                <span className={`text-[10px] font-mono ${drilldownData.summary.isBelowThreshold ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {drilldownData.summary.isBelowThreshold ? 'Below Threshold' : 'Healthy Margin'}
                </span>
              </div>
            </div>

            {/* Time Entries Breakdown */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Underlying Labor Records ({drilldownData.timeEntries?.length || 0})
              </h4>
              <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-800 divide-y divide-slate-800">
                {drilldownData.timeEntries?.map((entry: any) => (
                  <div key={entry.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-800/40">
                    <div>
                      <div className="font-semibold text-white">{entry.recruiter?.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {entry.taskType} • {new Date(entry.workDate).toISOString().slice(0, 10)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-white">{entry.hours}h</span>
                      <span className="block text-[10px] text-slate-400">{entry.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
