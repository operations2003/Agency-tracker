import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { TimeEntry, Client } from '../types';
import { Modal } from '../components/Modal';
import {
  Clock,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  DollarSign
} from 'lucide-react';

export const TimeEntryPage: React.FC<{ isOpenModalImmediately?: boolean }> = ({ isOpenModalImmediately = false }) => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(isOpenModalImmediately);

  // Form State
  const [clientId, setClientId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [taskType, setTaskType] = useState('SOURCING');
  const [workDate, setWorkDate] = useState(new Date().toISOString().slice(0, 10));
  const [hours, setHours] = useState('3.5');
  const [isBillable, setIsBillable] = useState(true);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const data = await api.getTimeEntries();
      setEntries(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
    const loadMetadata = async () => {
      try {
        const [clientsData, rolesData] = await Promise.all([
          api.getClients(),
          api.getRoles()
        ]);
        setClients(clientsData);
        setRoles(rolesData);
        if (clientsData.length > 0) setClientId(clientsData[0].id);
      } catch {
        // Ignore
      }
    };
    loadMetadata();
  }, []);

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createTimeEntry({
        clientId,
        roleId: roleId || undefined,
        taskType,
        workDate,
        hours: parseFloat(hours),
        isBillable,
        description,
        status: 'SUBMITTED'
      });
      setIsModalOpen(false);
      setDescription('');
      fetchEntries();
    } catch (err: any) {
      alert(err.message || 'Failed to record time entry');
    } finally {
      setSubmitting(false);
    }
  };

  const taskTypes = [
    'SOURCING',
    'SCREENING',
    'CANDIDATE_CALL',
    'INTERVIEW',
    'CLIENT_MEETING',
    'COORDINATION',
    'REPORTING',
    'OTHER'
  ];

  const totalLoggedHours = entries.reduce((acc, e) => acc + e.hours, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Time Tracking & Work Logging</h2>
          <p className="text-xs text-slate-400 mt-1">
            Log billable recruiter labor hours with client and search role attribution
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-medium transition shadow-lg shadow-sky-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Log Work Hours</span>
        </button>
      </div>

      {/* Summary Stat */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 uppercase font-medium">Total Recorded Hours</span>
          <div className="text-2xl font-bold text-white font-mono mt-1">{totalLoggedHours.toFixed(1)}h</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 uppercase font-medium">Approved Hours</span>
          <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
            {entries.filter(e => e.status === 'APPROVED').reduce((acc, e) => acc + e.hours, 0).toFixed(1)}h
          </div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 uppercase font-medium">Submitted / Pending Approval</span>
          <div className="text-2xl font-bold text-amber-400 font-mono mt-1">
            {entries.filter(e => e.status === 'SUBMITTED').reduce((acc, e) => acc + e.hours, 0).toFixed(1)}h
          </div>
        </div>
      </div>

      {/* Entries Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading logged time entries...</div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No time entries recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Recruiter</th>
                  <th className="py-3 px-4">Client & Role</th>
                  <th className="py-3 px-4">Task Type</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 font-mono">Hours</th>
                  <th className="py-3 px-4">Approval Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {entries.map(entry => (
                  <tr key={entry.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                      {new Date(entry.workDate).toISOString().slice(0, 10)}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-white text-xs">
                      {entry.recruiter?.name || 'Recruiter'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white text-xs">{entry.client?.name}</div>
                      <div className="text-[11px] text-slate-400">{entry.role?.title || 'General Account Support'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                        {entry.taskType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400 max-w-xs truncate">
                      {entry.description || '—'}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-white text-sm">
                      {entry.hours}h
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium border font-mono ${
                          entry.status === 'APPROVED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : entry.status === 'SUBMITTED'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Time Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Log Work Hours"
        subtitle="Record billable labor time against client account and recruitment role"
      >
        <form onSubmit={handleCreateEntry} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Recruitment Role (Optional)</label>
              <select
                value={roleId}
                onChange={e => setRoleId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
              >
                <option value="">General Client Activity</option>
                {roles.filter(r => !clientId || r.clientId === clientId).map(r => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Work Date</label>
              <input
                type="date"
                value={workDate}
                onChange={e => setWorkDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Hours Worked</label>
              <input
                type="number"
                step="0.25"
                min="0.25"
                max="24"
                value={hours}
                onChange={e => setHours(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Task Type</label>
              <select
                value={taskType}
                onChange={e => setTaskType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
              >
                {taskTypes.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="isBillable"
                checked={isBillable}
                onChange={e => setIsBillable(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600 bg-slate-800 border-slate-700 focus:ring-sky-500"
              />
              <label htmlFor="isBillable" className="text-xs font-medium text-slate-300">
                Billable Client Work
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Notes / Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
              placeholder="Candidate profiles reviewed, technical qualification calls..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-medium transition shadow-md shadow-sky-600/30"
            >
              {submitting ? 'Submitting...' : 'Submit Time Entry'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
