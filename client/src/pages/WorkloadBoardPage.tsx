import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { RecruiterWorkload } from '../types';
import { Modal } from '../components/Modal';
import { Users, AlertTriangle, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';

export const WorkloadBoardPage: React.FC = () => {
  const [workloads, setWorkloads] = useState<RecruiterWorkload[]>([]);
  const [loading, setLoading] = useState(true);
  const [thresholds, setThresholds] = useState({ maxOpenRoles: 8, maxWeeklyHours: 45 });

  // Reassign Modal
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<{ id: string; title: string; clientName: string } | null>(null);
  const [newRecruiterId, setNewRecruiterId] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchWorkload = async () => {
    setLoading(true);
    try {
      const data = await api.getWorkloadOverview();
      setWorkloads(data.recruiters);
      if (data.thresholds) setThresholds(data.thresholds);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkload();
  }, []);

  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole || !newRecruiterId) return;
    setSubmitting(true);
    try {
      await api.reassignRole(selectedRole.id, newRecruiterId, reassignReason);
      setIsReassignModalOpen(false);
      setSelectedRole(null);
      setReassignReason('');
      fetchWorkload();
    } catch (err: any) {
      alert(err.message || 'Failed to reassign role');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Recruiter Workload Balancer</h2>
          <p className="text-xs text-slate-400 mt-1">
            Track recruiter capacity, weekly logged hours, open search volume, and overload risk
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl">
          <span>Limits: <strong>{thresholds.maxOpenRoles} Roles</strong> / <strong>{thresholds.maxWeeklyHours}h Weekly</strong></span>
        </div>
      </div>

      {/* Recruiter Workload Cards Grid */}
      {loading ? (
        <div className="p-8 text-center text-sm text-slate-400">Loading recruiter capacity metrics...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {workloads.map(r => (
            <div
              key={r.recruiterId}
              className={`p-6 rounded-2xl bg-slate-900 border transition-all ${
                r.isOverloaded
                  ? 'border-rose-500/40 shadow-lg shadow-rose-950/20'
                  : 'border-slate-800 shadow-sm'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-bold text-base text-white">{r.recruiterName}</h3>
                    {r.isOverloaded ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono animate-pulse">
                        OVERLOADED
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                        Within Capacity
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{r.email}</p>
                </div>

                <div className="text-right">
                  <span className="text-2xl font-bold font-mono text-white">{r.utilizationPercentage}%</span>
                  <span className="block text-[10px] text-slate-400 uppercase font-semibold">Utilization</span>
                </div>
              </div>

              {/* Hours & Roles Metrics */}
              <div className="grid grid-cols-2 gap-4 my-4">
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Weekly Recorded Hours</span>
                  <div className="text-lg font-bold font-mono text-white mt-0.5">
                    {r.totalRecordedHoursThisWeek}h{' '}
                    <span className="text-xs font-normal text-slate-400">/ {r.weeklyCapacityHours}h</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {r.approvedHoursThisWeek}h approved • {r.submittedHoursThisWeek}h submitted
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Active Open Roles</span>
                  <div className="text-lg font-bold font-mono text-white mt-0.5">
                    {r.openRoleCount}{' '}
                    <span className="text-xs font-normal text-slate-400">
                      (Limit: {thresholds.maxOpenRoles})
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {r.openRoleCount > thresholds.maxOpenRoles ? '⚠️ Exceeds Limit' : '✓ Normal Load'}
                  </span>
                </div>
              </div>

              {/* Progress Capacity Bar */}
              <div className="space-y-1 mb-4">
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      r.isOverloaded ? 'bg-rose-500' : r.utilizationPercentage > 85 ? 'bg-amber-400' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, r.utilizationPercentage)}%` }}
                  />
                </div>
              </div>

              {/* Active Roles & Upcoming Deadlines */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Active Searches ({r.upcomingDeadlines?.length || 0})
                </h4>
                <div className="space-y-2">
                  {r.upcomingDeadlines?.map(deadline => (
                    <div
                      key={deadline.roleId}
                      className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-white">{deadline.title}</span>
                        <p className="text-[11px] text-slate-400">{deadline.clientName}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[11px] text-slate-400">
                          {new Date(deadline.deadline).toISOString().slice(0, 10)}
                        </span>
                        <button
                          onClick={() => {
                            setSelectedRole({
                              id: deadline.roleId,
                              title: deadline.title,
                              clientName: deadline.clientName
                            });
                            setIsReassignModalOpen(true);
                          }}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 text-[11px] font-medium transition"
                        >
                          Reassign
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Role Reassignment Modal */}
      <Modal
        isOpen={isReassignModalOpen}
        onClose={() => setIsReassignModalOpen(false)}
        title="Reassign Recruitment Role"
        subtitle={`Reallocating "${selectedRole?.title}" (${selectedRole?.clientName})`}
      >
        <form onSubmit={handleReassign} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Target Recruiter</label>
            <select
              value={newRecruiterId}
              onChange={e => setNewRecruiterId(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
            >
              <option value="">Select Recruiter...</option>
              {workloads.map(r => (
                <option key={r.recruiterId} value={r.recruiterId}>
                  {r.recruiterName} ({r.openRoleCount} roles, {r.utilizationPercentage}% capacity)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Reason for Reassignment</label>
            <textarea
              value={reassignReason}
              onChange={e => setReassignReason(e.target.value)}
              required
              rows={3}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
              placeholder="e.g. Workload rebalancing to prevent SLA breach..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsReassignModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-medium transition shadow-md shadow-sky-600/30"
            >
              {submitting ? 'Reassigning...' : 'Confirm Reassignment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

