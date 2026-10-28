import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Modal } from '../components/Modal';
import { Receipt, Plus, DollarSign, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

export const BillingReconciliationPage: React.FC = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [reconciliation, setReconciliation] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  // Modals
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isHireModalOpen, setIsHireModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);

  // Form states
  const [clientId, setClientId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('15000');
  const [periodStart, setPeriodStart] = useState(new Date().toISOString().slice(0, 8) + '01');
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().slice(0, 10));

  // Hire Form
  const [candidateName, setCandidateName] = useState('');
  const [feeAmount, setFeeAmount] = useState('9500');

  // Adjustment Form
  const [adjAmount, setAdjAmount] = useState('-1500');
  const [adjReason, setAdjReason] = useState('SLA Penalty Credit');

  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invData, recData, clientData, roleData] = await Promise.all([
        api.getInvoices(),
        api.getReconciliation(),
        api.getClients(),
        api.getRoles()
      ]);
      setInvoices(invData);
      setReconciliation(recData.reconciliation || []);
      setClients(clientData);
      setRoles(roleData);
      if (clientData.length > 0) setClientId(clientData[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createInvoice({
        clientId,
        invoiceNumber,
        amount: parseFloat(invoiceAmount),
        periodStart,
        periodEnd
      });
      setIsInvoiceModalOpen(false);
      setInvoiceNumber('');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordHire = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.recordBillableHire({
        clientId,
        roleId,
        candidateName,
        feeAmount: parseFloat(feeAmount),
        hireDate: new Date()
      });
      setIsHireModalOpen(false);
      setCandidateName('');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to record billable hire');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.recordFinancialAdjustment({
        clientId,
        amount: parseFloat(adjAmount),
        reason: adjReason
      });
      setIsAdjustmentModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to record adjustment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Billing & Financial Reconciliation</h2>
          <p className="text-xs text-slate-400 mt-1">
            Reconcile operational revenue recognition against issued invoices and adjustments
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsInvoiceModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-medium transition shadow-md shadow-sky-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Generate Invoice</span>
          </button>
          <button
            onClick={() => setIsHireModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Billable Placement</span>
          </button>
          <button
            onClick={() => setIsAdjustmentModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Adjustment</span>
          </button>
        </div>
      </div>

      {/* Reconciliation Comparison Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm space-y-2">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Revenue Reconciliation by Account</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Compares recognized operational revenue (retainer / hourly / placement) vs total invoiced amounts
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Model</th>
                <th className="py-3 px-4 text-right">Recognized Revenue</th>
                <th className="py-3 px-4 text-right">Total Invoiced</th>
                <th className="py-3 px-4 text-right">Variance / Difference</th>
                <th className="py-3 px-4">Reconciliation Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {reconciliation.map(item => (
                <tr key={item.clientId} className="hover:bg-slate-800/40">
                  <td className="py-3.5 px-4 font-semibold text-white text-xs">{item.clientName}</td>
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-300">{item.billingModel}</td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-white">${item.recognizedRevenue.toLocaleString()}</td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-300">${item.totalInvoiced.toLocaleString()}</td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold">
                    <span className={item.difference > 0 ? 'text-amber-400' : item.difference < 0 ? 'text-sky-400' : 'text-emerald-400'}>
                      {item.difference > 0 ? `+$${item.difference.toLocaleString()}` : `$${item.difference.toLocaleString()}`}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-mono border font-medium ${
                        item.status === 'BALANCED'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : item.status === 'UNINVOICED_REVENUE'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Issued Invoices</h3>
          <span className="text-xs text-slate-400 font-mono">{invoices.length} Invoices</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Invoice #</th>
                <th className="py-2.5 px-4">Client</th>
                <th className="py-2.5 px-4">Billing Period</th>
                <th className="py-2.5 px-4">Issued Date</th>
                <th className="py-2.5 px-4 text-right">Amount</th>
                <th className="py-2.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 font-mono font-bold text-white">{inv.invoiceNumber}</td>
                  <td className="py-2.5 px-4 text-slate-300">{inv.client?.name}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-400">
                    {new Date(inv.periodStart).toISOString().slice(0, 10)} to {new Date(inv.periodEnd).toISOString().slice(0, 10)}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-400">{new Date(inv.issuedDate).toISOString().slice(0, 10)}</td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-white">${inv.amount.toLocaleString()}</td>
                  <td className="py-2.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Modal */}
      <Modal isOpen={isInvoiceModalOpen} onClose={() => setIsInvoiceModalOpen(false)} title="Issue Billing Invoice">
        <form onSubmit={handleCreateInvoice} className="space-y-4">
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Invoice Number</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={e => setInvoiceNumber(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-sky-500"
                placeholder="INV-2026-003"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Invoice Amount ($)</label>
              <input
                type="number"
                step="0.01"
                value={invoiceAmount}
                onChange={e => setInvoiceAmount(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Period Start</label>
              <input
                type="date"
                value={periodStart}
                onChange={e => setPeriodStart(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Period End</label>
              <input
                type="date"
                value={periodEnd}
                onChange={e => setPeriodEnd(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsInvoiceModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-medium transition shadow-md shadow-sky-600/30"
            >
              {submitting ? 'Issuing...' : 'Issue Invoice'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Billable Hire Modal */}
      <Modal isOpen={isHireModalOpen} onClose={() => setIsHireModalOpen(false)} title="Record Billable Placement">
        <form onSubmit={handleRecordHire} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Client Account</label>
            <select
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
            >
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Recruitment Role</label>
            <select
              value={roleId}
              onChange={e => setRoleId(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
            >
              <option value="">Select Role...</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.title} ({r.clientName})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Candidate Name</label>
              <input
                type="text"
                value={candidateName}
                onChange={e => setCandidateName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
                placeholder="Dr. Raymond Zhao"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Placement Fee ($)</label>
              <input
                type="number"
                step="0.01"
                value={feeAmount}
                onChange={e => setFeeAmount(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsHireModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-medium transition"
            >
              {submitting ? 'Recording...' : 'Record Placement'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Financial Adjustment Modal */}
      <Modal isOpen={isAdjustmentModalOpen} onClose={() => setIsAdjustmentModalOpen(false)} title="Record Financial Adjustment">
        <form onSubmit={handleRecordAdjustment} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Client Account</label>
            <select
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
            >
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Adjustment Amount ($ - Negative for deduction / penalty credit)
            </label>
            <input
              type="number"
              step="0.01"
              value={adjAmount}
              onChange={e => setAdjAmount(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Audit Reason</label>
            <input
              type="text"
              value={adjReason}
              onChange={e => setAdjReason(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
              placeholder="e.g. Contractual SLA breach 5% fee concession"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsAdjustmentModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-medium transition"
            >
              {submitting ? 'Saving...' : 'Record Adjustment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

