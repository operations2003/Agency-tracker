import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { Settings, Save, CheckCircle2, ShieldAlert } from 'lucide-react';

export const BusinessRulesSettingsPage: React.FC = () => {
  const { success: showToastSuccess, error: showToastError } = useToast();
  const [settings, setSettings] = useState<any>({
    DEFAULT_MARGIN_WARNING: '20.0',
    DEFAULT_SLA_AMBER: '70.0',
    DEFAULT_SLA_RED: '90.0',
    DEFAULT_MAX_OPEN_ROLES: '8',
    DEFAULT_MAX_WEEKLY_HOURS: '45.0',
    SLACK_WEBHOOK_URL: '',
    WEEKLY_REPORT_EMAILS: 'management@agency.io'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const data = await api.getSettings();
        setSettings(data);
      } catch (err: any) {
        showToastError('Failed to Load Settings', err.message || 'Could not fetch business rules.');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      await api.updateSettings(settings);
      setSuccess(true);
      showToastSuccess('Settings Saved', 'Business rules and alert thresholds updated agency-wide.');
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      showToastError('Settings Update Failed', err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Business Rule & Risk Engine Settings</h2>
        <p className="text-xs text-slate-400 mt-1">
          Configure agency-wide thresholds for Margin Warnings (Rule 3), SLA Amber/Red Alerts (Rules 1 & 2), and Recruiter Overload (Rule 4)
        </p>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Business rule configuration and notification settings saved successfully!</span>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-sm text-slate-400">Loading settings...</div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Card: Financial Margin Threshold */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Rule 3 — Margin Leakage Safety Warning</span>
            </h3>
            <p className="text-xs text-slate-400">
              When client margin % falls below this threshold, automated warnings trigger on the dashboard and dispatch alerts.
            </p>

            <div className="max-w-xs">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Default Safety Margin Warning Threshold (%)
              </label>
              <input
                type="number"
                step="0.5"
                value={settings.DEFAULT_MARGIN_WARNING}
                onChange={e => setSettings({ ...settings, DEFAULT_MARGIN_WARNING: e.target.value })}
                required
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Card: SLA Clock Warning Thresholds */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span>Rules 1 & 2 — Contractual SLA Warning Triggers</span>
            </h3>
            <p className="text-xs text-slate-400">
              Contractual consumption milestones triggering warnings before breaches occur.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Rule 1: Amber Warning Consumption Threshold (%)
                </label>
                <input
                  type="number"
                  step="1"
                  value={settings.DEFAULT_SLA_AMBER}
                  onChange={e => setSettings({ ...settings, DEFAULT_SLA_AMBER: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-sky-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">Triggered if shortlist milestone is not yet reached</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Rule 2: Red Critical Warning Consumption Threshold (%)
                </label>
                <input
                  type="number"
                  step="1"
                  value={settings.DEFAULT_SLA_RED}
                  onChange={e => setSettings({ ...settings, DEFAULT_SLA_RED: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-sky-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">Triggered regardless of shortlist state</span>
              </div>
            </div>
          </div>

          {/* Card: Recruiter Workload Overload */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span>Rule 4 — Recruiter Overload Capacity Limits</span>
            </h3>
            <p className="text-xs text-slate-400">
              Both open search role limits and weekly hours limits are independently configurable.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Max Active Open Roles per Recruiter
                </label>
                <input
                  type="number"
                  value={settings.DEFAULT_MAX_OPEN_ROLES}
                  onChange={e => setSettings({ ...settings, DEFAULT_MAX_OPEN_ROLES: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Max Weekly Recorded Hours per Recruiter
                </label>
                <input
                  type="number"
                  step="1"
                  value={settings.DEFAULT_MAX_WEEKLY_HOURS}
                  onChange={e => setSettings({ ...settings, DEFAULT_MAX_WEEKLY_HOURS: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Card: Notification Integrations */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Notification & Webhook Dispatch Channels
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Slack Webhook URL</label>
              <input
                type="url"
                value={settings.SLACK_WEBHOOK_URL || ''}
                onChange={e => setSettings({ ...settings, SLACK_WEBHOOK_URL: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-sky-500"
                placeholder="https://hooks.slack.com/services/T00/B00/XXXX"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Weekly Management Summary Email Recipients
              </label>
              <input
                type="text"
                value={settings.WEEKLY_REPORT_EMAILS || ''}
                onChange={e => setSettings({ ...settings, WEEKLY_REPORT_EMAILS: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-sky-500"
                placeholder="director@agency.io, operations@agency.io"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-medium transition shadow-lg shadow-sky-600/30 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

