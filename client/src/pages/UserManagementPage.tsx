import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Modal } from '../components/Modal';
import { UserCheck, Plus, ShieldCheck, Mail, Building2 } from 'lucide-react';

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add User Modal
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'OWNER' | 'MANAGER' | 'RECRUITER' | 'FINANCE'>('RECRUITER');
  const [title, setTitle] = useState('Technical Recruiter');
  const [costType, setCostType] = useState('HOURLY');
  const [hourlyRate, setHourlyRate] = useState('45');
  const [monthlySalary, setMonthlySalary] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Client Assignment Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [assignedClientIds, setAssignedClientIds] = useState<string[]>([]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [usersData, clientsData] = await Promise.all([
        api.getUsers(),
        api.getClients()
      ]);
      setUsers(usersData);
      setClients(clientsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createUser({
        email,
        name,
        role,
        title,
        costType: role === 'RECRUITER' ? costType : undefined,
        hourlyRate: costType === 'HOURLY' ? hourlyRate : undefined,
        monthlySalary: costType === 'SALARIED' ? monthlySalary : undefined
      });
      setIsAddUserModalOpen(false);
      setEmail('');
      setName('');
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAssignments = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await api.updateUserAssignments(selectedUser.id, assignedClientIds);
      setIsAssignModalOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update client assignments');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleClientAssignment = (cId: string) => {
    if (assignedClientIds.includes(cId)) {
      setAssignedClientIds(assignedClientIds.filter(id => id !== cId));
    } else {
      setAssignedClientIds([...assignedClientIds, cId]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">User Directory & Role Permissions</h2>
          <p className="text-xs text-slate-400 mt-1">
            Role-based authorization, client scope isolation, and recruiter labor cost profiles
          </p>
        </div>

        <button
          onClick={() => setIsAddUserModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-medium transition shadow-lg shadow-sky-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add Agency User</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading user directory...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Name & Title</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Cost Basis</th>
                  <th className="py-3 px-4">Assigned Client Scope</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-semibold text-white text-xs">{u.name}</span>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{u.email}</span>
                          <span>•</span>
                          <span className="italic">{u.title || 'Staff'}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-medium border ${
                          u.role === 'OWNER'
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            : u.role === 'MANAGER'
                            ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                            : u.role === 'FINANCE'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-xs font-mono text-slate-300">
                      {u.currentCostProfile ? (
                        u.currentCostProfile.costType === 'HOURLY' ? (
                          <span>${u.currentCostProfile.hourlyCostRate}/hr (Hourly)</span>
                        ) : (
                          <span>${u.currentCostProfile.monthlySalary}/mo (Salaried)</span>
                        )
                      ) : (
                        <span className="text-slate-500 italic">No Labor Cost</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {u.role === 'OWNER' || u.role === 'FINANCE' ? (
                        <span className="text-xs text-purple-300 font-mono">Agency-Wide (All Clients)</span>
                      ) : u.assignedClients?.length === 0 ? (
                        <span className="text-xs text-slate-500 italic">No Assigned Clients</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {u.assignedClients?.map((c: any) => (
                            <span key={c.id} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                              {c.code}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {u.role !== 'OWNER' && u.role !== 'FINANCE' && (
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setAssignedClientIds(u.assignedClients?.map((c: any) => c.id) || []);
                            setIsAssignModalOpen(true);
                          }}
                          className="text-xs text-sky-400 hover:underline font-medium"
                        >
                          Assign Clients
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <Modal isOpen={isAddUserModalOpen} onClose={() => setIsAddUserModalOpen(false)} title="Create New Agency User">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
                placeholder="jane@agency.io"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Role Permission</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
              >
                <option value="RECRUITER">Recruiter</option>
                <option value="MANAGER">Delivery Manager</option>
                <option value="FINANCE">Finance Lead</option>
                <option value="OWNER">Agency Owner / Director</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Professional Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
                placeholder="Senior Talent Specialist"
              />
            </div>
          </div>

          {role === 'RECRUITER' && (
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3">
              <span className="text-xs font-semibold text-white block">Labor Cost Basis</span>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Cost Type</label>
                  <select
                    value={costType}
                    onChange={e => setCostType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                  >
                    <option value="HOURLY">Hourly Rate ($/hr)</option>
                    <option value="SALARIED">Monthly Salary ($/mo)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Rate Amount ({costType === 'HOURLY' ? '$/hr' : '$/mo'})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={costType === 'HOURLY' ? hourlyRate : monthlySalary}
                    onChange={e => costType === 'HOURLY' ? setHourlyRate(e.target.value) : setMonthlySalary(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsAddUserModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-medium transition shadow-md shadow-sky-600/30"
            >
              {submitting ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Client Assignment Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Client Accounts"
        subtitle={`Scope of access for ${selectedUser?.name}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Selected user will only have access to view roles, log hours, and receive alerts for checked clients.
          </p>

          <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-800 rounded-xl p-3">
            {clients.map(c => {
              const isChecked = assignedClientIds.includes(c.id);
              return (
                <div
                  key={c.id}
                  onClick={() => toggleClientAssignment(c.id)}
                  className="p-2.5 rounded-lg bg-slate-800/40 hover:bg-slate-800 flex items-center justify-between cursor-pointer text-xs"
                >
                  <div>
                    <span className="font-semibold text-white">{c.name}</span>
                    <span className="text-slate-400 ml-2 font-mono">({c.code})</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleClientAssignment(c.id)}
                    className="w-4 h-4 rounded text-sky-600 bg-slate-800 border-slate-700 focus:ring-sky-500"
                  />
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAssignments}
              disabled={submitting}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-medium transition"
            >
              {submitting ? 'Saving...' : 'Save Client Scope'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
