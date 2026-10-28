import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import { RecruitmentRole, Client } from '../types';
import { SlaBadge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { Pagination } from '../components/Pagination';
import {
  Briefcase,
  Search,
  Plus,
  ArrowRight,
  Filter,
  Clock,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

export const RoleListPage: React.FC<{ onSelectRole: (roleId: string) => void }> = ({ onSelectRole }) => {
  const { user, isRecruiter } = useAuth();
  const { success, error } = useToast();
  const [roles, setRoles] = useState<RecruitmentRole[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [recruiters, setRecruiters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // New Role Form
  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('HIGH');
  const [recruiterId, setRecruiterId] = useState('');
  const [targetDays, setTargetDays] = useState('14');
  const [deadlinePolicy, setDeadlinePolicy] = useState('WORKING_DAYS');
  const [submitting, setSubmitting] = useState(false);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const data = await api.getRoles({
        search: search || undefined,
        stage: stageFilter || undefined,
        priority: priorityFilter || undefined
      });
      setRoles(data);
    } catch (err: any) {
      error('Failed to Load Roles', err.message || 'Could not fetch recruitment roles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
    setCurrentPage(1);
    const loadMetadata = async () => {
      try {
        const [clientsData, usersData] = await Promise.all([
          api.getClients(),
          api.getUsers()
        ]);
        setClients(clientsData);
        setRecruiters(usersData.filter((u: any) => u.role === 'RECRUITER'));
        if (clientsData.length > 0) setClientId(clientsData[0].id);
      } catch {
        // Ignore
      }
    };
    loadMetadata();
  }, [search, stageFilter, priorityFilter]);

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createRole({
        clientId,
        title,
        description,
        priority,
        recruiterId: recruiterId || undefined,
        targetDays: parseInt(targetDays, 10),
        deadlinePolicy
      });
      setIsAddModalOpen(false);
      setTitle('');
      setDescription('');
      success('Role Search Opened', `${title} created with ${targetDays}-day SLA tracking.`);
      fetchRoles();
    } catch (err: any) {
      error('Failed to Create Role', err.message || 'Failed to create recruitment request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Recruitment Roles & SLA Tracker</h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time contractual SLA clock countdowns, stage progression, and breach risk monitoring
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-medium transition shadow-lg shadow-sky-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Recruitment Request</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search roles by title..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
          />
        </div>

        <select
          value={stageFilter}
          onChange={e => setStageFilter(e.target.value)}
          className="px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-sky-500"
        >
          <option value="">All Pipeline Stages</option>
          <option value="NEW_REQUEST">New Request</option>
          <option value="SOURCING">Sourcing</option>
          <option value="SCREENING">Screening</option>
          <option value="SHORTLISTING">Shortlisting</option>
          <option value="SHORTLIST_SUBMITTED">Shortlist Submitted</option>
          <option value="INTERVIEW">Interview</option>
          <option value="OFFER">Offer</option>
          <option value="HIRED_FILLED">Hired / Filled</option>
        </select>

        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          className="px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-sky-500"
        >
          <option value="">All Priorities</option>
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      {/* Roles List Table */}
      {loading ? (
        <TableSkeleton rows={5} cols={7} />
      ) : roles.length === 0 ? (
        <EmptyState
          title="No recruitment roles found"
          description={search || stageFilter || priorityFilter ? "No open searches match your current criteria. Try resetting filters." : "No recruitment requirements are open. Create your first role search."}
          actionLabel={!isRecruiter ? "Create New Search" : undefined}
          onAction={!isRecruiter ? () => setIsAddModalOpen(true) : undefined}
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Role Title & Client</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Recruiter</th>
                  <th className="py-3 px-4">SLA Clock Status</th>
                  <th className="py-3 px-4">Contractual Deadline</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {roles.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(role => (
                  <tr
                    key={role.id}
                    onClick={() => onSelectRole(role.id)}
                    className="hover:bg-slate-800/40 transition cursor-pointer group"
                  >
                    <td className="py-3.5 px-4">
                      <div>
                        <div className="font-semibold text-white group-hover:text-sky-400 transition">
                          {role.title}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-sky-400">{role.clientCode}</span>
                          <span>•</span>
                          <span>{role.clientName}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                        {role.currentStage}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[11px] font-mono px-2 py-0.5 rounded font-semibold ${
                          role.priority === 'URGENT'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : role.priority === 'HIGH'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {role.priority}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-300">
                      {role.recruiter?.name || <span className="text-slate-500 italic">Unassigned</span>}
                    </td>

                    <td className="py-3.5 px-4">
                      <SlaBadge
                        status={role.slaEvaluation?.slaStatus || 'ON_TRACK'}
                        consumption={role.slaEvaluation?.consumptionPercentage}
                      />
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-xs font-mono font-medium text-white">
                        {new Date(role.slaDeadlineDate).toISOString().slice(0, 10)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {role.slaEvaluation?.remainingDurationHours !== undefined && role.slaEvaluation.remainingDurationHours > 0
                          ? `${role.slaEvaluation.remainingDurationHours}h remaining`
                          : 'Exceeded'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRole(role.id);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={roles.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* New Recruitment Role Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Open New Recruitment Request"
        subtitle="Initialize candidate search and calculate contractual SLA deadline clock"
      >
        <form onSubmit={handleCreateRole} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Client Account</label>
            <select
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
            >
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code}) - {c.billingModel}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Position / Job Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
              placeholder="e.g. Lead Distributed Systems Engineer"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Search Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Assigned Recruiter</label>
              <select
                value={recruiterId}
                onChange={e => setRecruiterId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
              >
                <option value="">Unassigned</option>
                {recruiters.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Target SLA Days</label>
              <input
                type="number"
                value={targetDays}
                onChange={e => setTargetDays(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Deadline Policy</label>
              <select
                value={deadlinePolicy}
                onChange={e => setDeadlinePolicy(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
              >
                <option value="WORKING_DAYS">Working Days (Excludes Weekends & Holidays)</option>
                <option value="CALENDAR_DAYS">Calendar Days (24/7)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Role Description / Scope</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
              placeholder="Candidate requirements, target tech stack, or hiring requirements..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-medium transition shadow-md shadow-sky-600/30"
            >
              {submitting ? 'Creating...' : 'Initialize SLA Clock & Open Role'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

