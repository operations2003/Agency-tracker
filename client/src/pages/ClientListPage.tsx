import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Client } from '../types';
import { Modal } from '../components/Modal';
import { Building2, Search, Plus, ArrowRight, ShieldAlert, Calendar } from 'lucide-react';

export const ClientListPage: React.FC<{ onSelectClient: (clientId: string) => void }> = ({ onSelectClient }) => {
  const { isOwner, isManager } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [billingModelFilter, setBillingModelFilter] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [billingModel, setBillingModel] = useState<'RETAINER' | 'HOURLY' | 'PER_HIRE'>('RETAINER');
  const [billingRate, setBillingRate] = useState('12000');
  const [currency, setCurrency] = useState('USD');
  const [timeZone, setTimeZone] = useState('America/New_York');
  const [marginWarningThreshold, setMarginWarningThreshold] = useState('20.0');
  const [deadlinePolicy, setDeadlinePolicy] = useState<'WORKING_DAYS' | 'CALENDAR_DAYS'>('WORKING_DAYS');
  const [targetSlaDays, setTargetSlaDays] = useState('14');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const data = await api.getClients({
        search: search || undefined,
        billingModel: billingModelFilter || undefined
      });
      setClients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [search, billingModelFilter]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createClient({
        name,
        code,
        billingModel,
        billingRate: parseFloat(billingRate),
        currency,
        timeZone,
        marginWarningThreshold: parseFloat(marginWarningThreshold),
        deadlinePolicy,
        targetSlaDays: parseInt(targetSlaDays, 10),
        notes
      });
      setIsAddModalOpen(false);
      setName('');
      setCode('');
      fetchClients();
    } catch (err: any) {
      alert(err.message || 'Failed to create client');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Search Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Client Directory</h2>
          <p className="text-xs text-slate-400 mt-1">
            Contract terms, SLA baseline policies, and margin warning thresholds
          </p>
        </div>

        {(isOwner || isManager) && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-medium transition shadow-lg shadow-sky-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Client</span>
          </button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search clients by name or code..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
          />
        </div>

        <select
          value={billingModelFilter}
          onChange={e => setBillingModelFilter(e.target.value)}
          className="px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-sky-500"
        >
          <option value="">All Billing Models</option>
          <option value="RETAINER">Retainer</option>
          <option value="HOURLY">Hourly Billable</option>
          <option value="PER_HIRE">Per Hire Contingency</option>
        </select>
      </div>

      {/* Clients Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading clients...</div>
        ) : clients.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No client accounts found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Billing Model</th>
                  <th className="py-3 px-4">Contract Rate</th>
                  <th className="py-3 px-4">SLA Deadline Policy</th>
                  <th className="py-3 px-4">Margin Threshold</th>
                  <th className="py-3 px-4">Open Roles</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {clients.map(client => (
                  <tr
                    key={client.id}
                    onClick={() => onSelectClient(client.id)}
                    className="hover:bg-slate-800/40 transition cursor-pointer group"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-sky-950 border border-sky-800 flex items-center justify-center font-bold text-sky-400 text-xs">
                          {client.code}
                        </div>
                        <div>
                          <div className="font-semibold text-white group-hover:text-sky-400 transition">
                            {client.name}
                          </div>
                          <div className="text-[11px] text-slate-400">{client.timeZone}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                        {client.billingModel}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-medium text-white">
                      ${client.activeContractTerm?.billingRate?.toLocaleString() || '0'}{' '}
                      <span className="text-xs text-slate-400">
                        {client.billingModel === 'HOURLY' ? '/hr' : client.billingModel === 'PER_HIRE' ? '/hire' : '/mo'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-xs text-slate-300">
                        {client.slaPolicy?.defaultTargetDays || 14} {client.deadlinePolicy === 'WORKING_DAYS' ? 'Working Days' : 'Calendar Days'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-xs text-amber-400 font-medium">
                        &lt; {client.marginWarningThreshold}% Warning
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {client.openRolesCount || 0} Open
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectClient(client.id);
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
        )}
      </div>

      {/* Add Client Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Client & Contract"
        subtitle="Configure billing model, SLA rules, and margin safety thresholds"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateClient} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Company Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
                placeholder="Acme Global Inc"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Client Code</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                required
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-mono uppercase focus:outline-none focus:border-sky-500"
                placeholder="ACME"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Billing Model</label>
              <select
                value={billingModel}
                onChange={e => setBillingModel(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
              >
                <option value="RETAINER">Retainer (Monthly Fee)</option>
                <option value="HOURLY">Hourly (Approved Billable Hours)</option>
                <option value="PER_HIRE">Per Hire (Contingency Placement)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Contract Rate ({billingModel === 'HOURLY' ? '$/hr' : billingModel === 'PER_HIRE' ? '$/hire' : '$/month'})
              </label>
              <input
                type="number"
                step="0.01"
                value={billingRate}
                onChange={e => setBillingRate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Default Target SLA (Days)</label>
              <input
                type="number"
                value={targetSlaDays}
                onChange={e => setTargetSlaDays(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Deadline Policy</label>
              <select
                value={deadlinePolicy}
                onChange={e => setDeadlinePolicy(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
              >
                <option value="WORKING_DAYS">Working Days (Excludes Weekends & Holidays)</option>
                <option value="CALENDAR_DAYS">Calendar Days (24/7 Duration)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Margin Warning Threshold (%)</label>
              <input
                type="number"
                step="0.5"
                value={marginWarningThreshold}
                onChange={e => setMarginWarningThreshold(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Client Time Zone</label>
              <select
                value={timeZone}
                onChange={e => setTimeZone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
              >
                <option value="America/New_York">America/New_York (EST/EDT)</option>
                <option value="America/Chicago">America/Chicago (CST/CDT)</option>
                <option value="America/Denver">America/Denver (MST/MDT)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Contract Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
              placeholder="Contractual details, penalty clauses, or special terms..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-medium transition shadow-md shadow-sky-600/30"
            >
              {submitting ? 'Creating...' : 'Create Client Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
