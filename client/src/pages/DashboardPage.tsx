import React, { useState, useEffect } from 'react';
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
  Calendar
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
  Cell
} from 'recharts';

export const DashboardPage: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { user, isRecruiter } = useAuth();
  const [loading, setLoading] = useState(true);
  const [marginSummary, setMarginSummary] = useState<any>(null);
  const [slaSummary, setSlaSummary] = useState<any>(null);
  const [workloadOverview, setWorkloadOverview] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [slaData, alertsData] = await Promise.all([
          api.getSlaSummary(),
          api.getAlerts({ status: 'OPEN' })
        ]);
        setSlaSummary(slaData);
        setAlerts(alertsData);

        if (!isRecruiter) {
          const [marginData, workloadData] = await Promise.all([
            api.getMarginSummary(),
            api.getWorkloadOverview()
          ]);
          setMarginSummary(marginData);
          setWorkloadOverview(workloadData);
        }
      } catch (err) {
        console.error('Error fetching dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isRecruiter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-400 text-sm">
          <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading operational and financial indicators...</span>
        </div>
      </div>
    );
  }

  // Stage distribution data for pie chart
  const stageDistribution = [
    { name: 'Sourcing', value: 4, color: '#38bdf8' },
    { name: 'Screening', value: 3, color: '#818cf8' },
    { name: 'Shortlisting', value: 2, color: '#fbbf24' },
    { name: 'Interview', value: 2, color: '#34d399' },
    { name: 'Filled', value: 3, color: '#10b981' }
  ];

  return (
    <div className="space-y-6">
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
              subtitle="Current Billing Window"
              icon={<DollarSign className="w-5 h-5 text-sky-400" />}
              trend={{ value: 'Actuals', isPositive: true }}
            />
            <MetricCard
              title="Direct Labor Cost"
              value={`$${(marginSummary?.totalDirectCost || 0).toLocaleString()}`}
              subtitle={`${marginSummary?.totalUnapprovedHours || 0}h submitted / provisional`}
              icon={<TrendingDown className="w-5 h-5 text-amber-400" />}
              trend={{
                value: marginSummary?.isProvisional ? 'Provisional' : 'Verified',
                isWarning: marginSummary?.isProvisional
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
                {marginSummary?.lowestMarginClients?.map((client: any) => (
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
                ))}
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
                <p className="text-xs text-slate-400 mt-0.5">Upcoming deadlines ordered by consumption</p>
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
              {slaSummary?.clocks?.slice(0, 5).map((clock: any) => (
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
              ))}
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

