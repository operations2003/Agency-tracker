import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { MetricCard } from '../components/MetricCard';
import { SlaBadge, MarginBadge, Badge } from '../components/Badge';
import {
  DollarSign,
  TrendingDown,
  Clock,
  AlertTriangle,
  Briefcase,
  Users,
  ArrowRight,
  ShieldAlert,
  Calendar,
  Filter,
  RefreshCw,
  Sparkles,
  Layers,
  Database
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from 'recharts';

export const DashboardPage: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { user, isRecruiter } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [marginSummary, setMarginSummary] = useState<any>(null);
  const [slaSummary, setSlaSummary] = useState<any>(null);
  const [workloadOverview, setWorkloadOverview] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  // Reporting Period & Client Filters
  const [period, setPeriod] = useState<string>('current_month');
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Calculate actual Date Range based on period selection
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

  const fetchData = async () => {
    try {
      const [slaData, alertsData, clientsData, rolesData] = await Promise.all([
        api.getSlaSummary(),
        api.getAlerts({ status: 'OPEN' }),
        api.getClients(),
        api.getRoles()
      ]);
      setSlaSummary(slaData);
      setAlerts(alertsData);
      setClients(clientsData);
      setRoles(rolesData);

      if (!isRecruiter) {
        const [marginData, workloadData] = await Promise.all([
          api.getMarginSummary({
            startDate: dateRange.startDate,
            endDate: dateRange.endDate
          }),
          api.getWorkloadOverview()
        ]);
        setMarginSummary(marginData);
        setWorkloadOverview(workloadData);
      }
    } catch (err) {
      console.error('Error fetching dashboard data', err);
    }
  };

  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      await fetchData();
      setLoading(false);
    };
    loadInitial();
  }, [isRecruiter, dateRange]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Real API-Derived Role Pipeline Stage Distribution
  const stageDistribution = useMemo(() => {
    const stageCounts: Record<string, number> = {
      'Sourcing': 0,
      'Screening': 0,
      'Shortlisting': 0,
      'Interview': 0,
      'Offer': 0,
      'Filled': 0
    };

    const stageColors: Record<string, string> = {
      'Sourcing': '#38bdf8',
      'Screening': '#818cf8',
      'Shortlisting': '#fbbf24',
      'Interview': '#34d399',
      'Offer': '#f472b6',
      'Filled': '#10b981'
    };

    const filteredRoles = selectedClientId === 'all'
      ? roles
      : roles.filter(r => r.clientId === selectedClientId);

    for (const r of filteredRoles) {
      if (r.currentStage === 'NEW_REQUEST' || r.currentStage === 'SOURCING') {
        stageCounts['Sourcing']++;
      } else if (r.currentStage === 'SCREENING') {
        stageCounts['Screening']++;
      } else if (r.currentStage === 'SHORTLISTING' || r.currentStage === 'SHORTLIST_SUBMITTED') {
        stageCounts['Shortlisting']++;
      } else if (r.currentStage === 'INTERVIEW') {
        stageCounts['Interview']++;
      } else if (r.currentStage === 'OFFER') {
        stageCounts['Offer']++;
      } else if (r.currentStage === 'HIRED_FILLED') {
        stageCounts['Filled']++;
      }
    }

    return Object.entries(stageCounts).map(([name, value]) => ({
      name,
      value,
      color: stageColors[name]
    })).filter(item => item.value > 0);
  }, [roles, selectedClientId]);

  // Filtered SLA Clocks based on client filter
  const filteredClocks = useMemo(() => {
    if (!slaSummary?.clocks) return [];
    if (selectedClientId === 'all') return slaSummary.clocks;
    return slaSummary.clocks.filter((c: any) => {
      const matchRole = roles.find(r => r.id === c.roleId);
      return matchRole?.clientId === selectedClientId;
    });
  }, [slaSummary, selectedClientId, roles]);

  // Filtered Lowest Margin Clients based on client filter
  const filteredMarginClients = useMemo(() => {
    if (!marginSummary?.lowestMarginClients) return [];
    if (selectedClientId === 'all') return marginSummary.lowestMarginClients;
    return marginSummary.lowestMarginClients.filter((c: any) => c.clientId === selectedClientId);
  }, [marginSummary, selectedClientId]);

  // Top client margins chart data
  const clientMarginsChartData = useMemo(() => {
    if (!marginSummary?.lowestMarginClients) return [];
    return marginSummary.lowestMarginClients.map((c: any) => ({
      name: c.clientName.length > 12 ? c.clientCode : c.clientName,
      Revenue: c.totalRevenue,
      LaborCost: c.directCost,
      Profit: c.profit,
      MarginPct: c.profitMarginPercentage ?? 0
    }));
  }, [marginSummary]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[450px]">
        <div className="flex flex-col items-center gap-3 text-slate-400 text-sm">
          <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <span>Ingesting operational indicators and calculating contractual SLA clocks...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-white tracking-tight">Executive Management Overview</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center gap-1">
              <Database className="w-3 h-3" />
              <span>Actual API Telemetry</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time financial revenue recognition, contractual SLA clocks, and recruiter capacity balancer
          </p>
        </div>

        {/* Global Reporting Filters */}
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

          {/* Custom Date Pickers if selected */}
          {period === 'custom' && (
            <div className="flex items-center gap-1.5 text-xs">
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
              />
              <span className="text-slate-500">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
          )}

          {/* Client Filter */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-2" />
            <select
              value={selectedClientId}
              onChange={e => setSelectedClientId(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer max-w-[160px] truncate"
            >
              <option value="all" className="bg-slate-900">All Client Accounts</option>
              {clients.map(c => (
                <option key={c.id} value={c.id} className="bg-slate-900">
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* Manual Refresh Button */}
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition"
            title="Refresh Real-time KPIs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-sky-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Top Banner & Alert Callout */}
      {alerts.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border border-rose-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">
                {alerts.length} Active SLA / Margin Risks Detected
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Immediate intervention required to prevent contractual penalties and margin erosion.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('alerts')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 border border-rose-500/30 text-xs font-medium transition"
          >
            <span>Review Alert Center</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {!isRecruiter && (
          <>
            <MetricCard
              title="Recognized Revenue"
              value={`$${(marginSummary?.totalRevenue || 0).toLocaleString()}`}
              subtitle={`${dateRange.startDate} to ${dateRange.endDate}`}
              icon={<DollarSign className="w-5 h-5 text-sky-400" />}
              trend={{ value: 'Actuals', isPositive: true }}
            />
            <MetricCard
              title="Direct Labor Cost"
              value={`$${(marginSummary?.totalDirectCost || 0).toLocaleString()}`}
              subtitle={`${marginSummary?.totalUnapprovedHours || 0}h submitted / provisional`}
              icon={<TrendingDown className="w-5 h-5 text-amber-400" />}
              trend={{
                value: marginSummary?.isProvisional ? 'Provisional' : 'Verified Actuals',
                isWarning: marginSummary?.isProvisional,
                isPositive: !marginSummary?.isProvisional
              }}
            />
            <MetricCard
              title="Gross Profit"
              value={`$${(marginSummary?.totalProfit || 0).toLocaleString()}`}
              subtitle={`Agency Margin: ${marginSummary?.agencyMarginPercentage ?? 'N/A'}%`}
              icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
              trend={{
                value: (marginSummary?.agencyMarginPercentage || 0) < 20 ? 'Below 20% Threshold' : 'Target Met',
                isWarning: (marginSummary?.agencyMarginPercentage || 0) < 20,
                isPositive: (marginSummary?.agencyMarginPercentage || 0) >= 20
              }}
            />
          </>
        )}

        <MetricCard
          title="Active Roles Under SLA"
          value={slaSummary?.totalActiveRoles || 0}
          subtitle={`${slaSummary?.breachedCount || 0} Breaches | ${slaSummary?.amberCount || 0} Amber`}
          icon={<Briefcase className="w-5 h-5 text-purple-400" />}
          trend={{
            value: slaSummary?.atRiskCount > 0 ? `${slaSummary.atRiskCount} at risk` : 'All On Track',
            isWarning: slaSummary?.atRiskCount > 0,
            isPositive: slaSummary?.atRiskCount === 0
          }}
        />

        {!isRecruiter && (
          <MetricCard
            title="Recruiter Capacity"
            value={`${workloadOverview?.overloadedCount || 0} Overloaded`}
            subtitle={`Across ${workloadOverview?.totalRecruiters || 0} active recruiters`}
            icon={<Users className="w-5 h-5 text-sky-400" />}
            trend={{
              value: workloadOverview?.overloadedCount > 0 ? 'Rebalance Needed' : 'Balanced',
              isWarning: workloadOverview?.overloadedCount > 0,
              isPositive: workloadOverview?.overloadedCount === 0
            }}
          />
        )}
      </div>

      {/* Visual Analytics Row: Pipeline Distribution & Account Financials */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dynamic Role Pipeline Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-white">Active Pipeline Stages</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Real-time candidate workflow status</p>
              </div>
              <span className="text-xs font-mono font-medium text-sky-400">
                {roles.length} Total Searches
              </span>
            </div>

            {stageDistribution.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">No active searches recorded</div>
            ) : (
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="w-36 h-36 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stageDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={56}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {stageDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex-1 space-y-1.5 w-full">
                  {stageDistribution.map(stage => (
                    <div key={stage.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                        <span className="text-slate-300">{stage.name}</span>
                      </div>
                      <span className="font-mono font-semibold text-white">{stage.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Milestone Target: Shortlist Submitted</span>
            <button onClick={() => onNavigate('roles')} className="text-sky-400 hover:underline">
              View Roles
            </button>
          </div>
        </div>

        {/* Client Margin & Labor Cost Visual Breakdown */}
        {!isRecruiter && (
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-semibold text-white">Client Financial Comparison</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Recognized revenue vs direct labor costs by client</p>
                </div>
                <button
                  onClick={() => onNavigate('margins')}
                  className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1"
                >
                  <span>Full Board</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {clientMarginsChartData.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">No client revenue data available</div>
              ) : (
                <div className="mt-4 h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={clientMarginsChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={v => `$${v / 1000}k`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                        formatter={(value: any) => [`$${Number(value).toLocaleString()}`, '']}
                      />
                      <Bar dataKey="Revenue" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="LaborCost" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-sky-400" />
                  <span>Revenue</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-amber-400" />
                  <span>Direct Labor Cost</span>
                </span>
              </div>
              <span className="text-amber-400">Rule 3 Safety Threshold: 20.0%</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Lowest Margin Accounts & SLA Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lowest Margin Accounts */}
        {!isRecruiter && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-semibold text-white">Lowest Margin Accounts</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Identified margin leakage accounts</p>
                </div>
                <button
                  onClick={() => onNavigate('margins')}
                  className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1"
                >
                  <span>Margin Board</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="mt-4 divide-y divide-slate-800/60">
                {filteredMarginClients.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">No account margin records matching filter.</div>
                ) : (
                  filteredMarginClients.map((client: any) => (
                    <div key={client.clientId} className="py-3.5 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-white">{client.clientName}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            {client.billingModel}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Revenue: ${client.totalRevenue.toLocaleString()} | Direct Cost: ${client.directCost.toLocaleString()}
                        </p>
                      </div>

                      <div className="text-right">
                        <MarginBadge status={client.marginStatus} marginPct={client.profitMarginPercentage} />
                        <div className="text-[11px] text-slate-400 mt-1">
                          Profit: <span className={client.profit < 0 ? 'text-rose-400 font-semibold' : 'text-slate-300'}>
                            ${client.profit.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>Safety Threshold: <strong>20.0% Margin</strong></span>
              <span className="text-amber-400">
                {marginSummary?.clientsBelowThresholdCount || 0} Account(s) Below Threshold
              </span>
            </div>
          </div>
        )}

        {/* SLA Deadline Risk List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-white">SLA Deadline Risk Clocks</h3>
                <p className="text-xs text-slate-400 mt-0.5">Upcoming contractual deadlines ordered by consumption</p>
              </div>
              <button
                onClick={() => onNavigate('roles')}
                className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1"
              >
                <span>All Roles</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-4 divide-y divide-slate-800/60">
              {filteredClocks.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">No active SLA clocks matching filter.</div>
              ) : (
                filteredClocks.slice(0, 5).map((clock: any) => (
                  <div key={clock.roleId} className="py-3 flex items-center justify-between">
                    <div className="max-w-[65%]">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white truncate">{clock.roleTitle}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          {clock.priority}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {clock.clientName} • Assigned: {clock.recruiterName || 'Unassigned'}
                      </p>
                    </div>

                    <div className="text-right">
                      <SlaBadge status={clock.slaStatus} consumption={clock.consumptionPercentage} />
                      <p className="text-[11px] text-slate-400 mt-1 font-mono">
                        {clock.remainingDurationHours > 0
                          ? `${clock.remainingDurationHours}h remaining`
                          : 'Deadline Exceeded'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Rules: <strong>Amber (≥70%)</strong> | <strong>Red (≥90%)</strong></span>
            <button
              onClick={() => onNavigate('roles')}
              className="text-sky-400 hover:underline"
            >
              View Pipeline Kanban
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
