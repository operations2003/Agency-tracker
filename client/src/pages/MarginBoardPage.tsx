import React, { useState, useEffect, useMemo } from 'react';
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
  DollarSign,
  Search,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';

export const MarginBoardPage: React.FC = () => {
  const [margins, setMargins] = useState<MarginResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'margin' | 'revenue' | 'profit' | 'cost'>('margin');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [billingModelFilter, setBillingModelFilter] = useState('');

  // Reporting Period State
  const [period, setPeriod] = useState<string>('current_month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Drilldown modal
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [drilldownData, setDrilldownData] = useState<any>(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  // Compute actual date range
  const dateRange = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    if (period === 'current_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else if (period === 'quarter') {
      const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
      start = new Date(now.getFullYear(), qStartMonth, 1);
    } else if (period === 'year') {
      start = new Date(now.getFullYear(), 0, 1);
    } else if (period === 'custom' && customStartDate && customEndDate) {
      start = new Date(customStartDate);
      end = new Date(customEndDate);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10)
    };
  }, [period, customStartDate, customEndDate]);

  const fetchMargins = async () => {
    setLoading(true);
    try {
      const data = await api.getClientMargins({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
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
  }, [dateRange, sortBy, sortOrder]);

  const handleOpenDrilldown = async (clientId: string) => {
    setSelectedClientId(clientId);
    setDrilldownLoading(true);
    try {
      const data = await api.getClientDrilldown(clientId, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      setDrilldownData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setDrilldownLoading(false);
    }
  };

  const handleExportCsv = () => {
    window.open('/api/v1/csv/export/clients', '_blank');
  };

  const filteredMargins = margins.filter(m => {
    const matchBilling = !billingModelFilter || m.billingModel === billingModelFilter;
    const matchSearch = !search ||
      m.clientName.toLowerCase().includes(search.toLowerCase()) ||
      m.clientCode.toLowerCase().includes(search.toLowerCase());
    return matchBilling && matchSearch;
  });

  // Calculate board aggregates
  const totalRevenue = filteredMargins.reduce((acc, m) => acc + m.totalRevenue, 0);
  const totalCost = filteredMargins.reduce((acc, m) => acc + m.directCost, 0);
  const totalProfit = filteredMargins.reduce((acc, m) => acc + m.profit, 0);
  const overallMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 'N/A';
  const belowThresholdCount = filteredMargins.filter(m => m.isBelowThreshold).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Client Margin Board</h2>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic revenue recognition, direct labor cost allocation, and margin leakage warnings
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period Selector */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-slate-400 mr-2" />
            <select
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="current_month" className="bg-slate-900">Current Month</option>
              <option value="last_month" className="bg-slate-900">Last Month</option>
              <option value="quarter" className="bg-slate-900">Quarter to Date</option>
              <option value="year" className="bg-slate-900">Year to Date</option>
              <option value="custom" className="bg-slate-900">Custom Date Range</option>
            </select>
          </div>

          {period === 'custom' && (
            <div className="flex items-center gap-1.5 text-xs">
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-sky-500"
              />
              <span className="text-slate-500">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          )}

          <select
            value={billingModelFilter}
            onChange={e => setBillingModelFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-sky-500"
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
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-sky-500"
          >
            <option value="margin-asc">Lowest Margin (Risk First)</option>
            <option value="margin-desc">Highest Margin</option>
            <option value="profit-asc">Lowest Gross Profit</option>
            <option value="profit-desc">Highest Gross Profit</option>
            <option value="revenue-desc">Highest Revenue</option>
            <option value="cost-desc">Highest Direct Cost</option>
          </select>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-slate-300 hover:text-white transition"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] uppercase font-semibold text-slate-400">Total Recognized Revenue</span>
          <div className="text-lg font-bold font-mono text-white mt-0.5">${totalRevenue.toLocaleString()}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] uppercase font-semibold text-slate-400">Direct Labor Allocated</span>
          <div className="text-lg font-bold font-mono text-slate-300 mt-0.5">${totalCost.toLocaleString()}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] uppercase font-semibold text-slate-400">Total Gross Profit</span>
          <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">${totalProfit.toLocaleString()}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] uppercase font-semibold text-slate-400">Overall Margin / Safety</span>
          <div className="text-lg font-bold font-mono text-white mt-0.5 flex items-center justify-between">
            <span>{overallMargin}%</span>
            {belowThresholdCount > 0 && (
              <span className="text-[11px] font-sans font-medium text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{belowThresholdCount} at risk</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by client name or code..."
          className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
        />
      </div>

      {/* Margins Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Calculating real-time client margins...</div>
        ) : filteredMargins.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No client records found matching criteria.</div>
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
        subtitle={`Period: ${dateRange.startDate} to ${dateRange.endDate} • Detailed source labor allocation`}
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
                  {drilldownData.summary.isBelowThreshold ? 'Below Safety Threshold' : 'Healthy Margin'}
                </span>
              </div>
            </div>

            {/* Time Entries Breakdown */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Underlying Labor Records ({drilldownData.timeEntries?.length || 0})
              </h4>
              <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-800 divide-y divide-slate-800">
                {drilldownData.timeEntries?.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">No time entries in this period.</div>
                ) : (
                  drilldownData.timeEntries?.map((entry: any) => (
                    <div key={entry.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-800/40">
                      <div>
                        <div className="font-semibold text-white">{entry.recruiter?.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {entry.taskType} • {new Date(entry.workDate).toISOString().slice(0, 10)}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-white">{entry.hours}h</span>
                        <span className={`block text-[10px] font-mono ${entry.status === 'APPROVED' ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {entry.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
