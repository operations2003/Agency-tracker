import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  FileSpreadsheet,
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  FileText,
  History
} from 'lucide-react';

export const CsvImportPage: React.FC = () => {
  const [selectedEntity, setSelectedEntity] = useState<string>('CLIENTS');
  const [csvContent, setCsvContent] = useState('');
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const fetchHistory = async () => {
    try {
      const data = await api.getCsvHistory();
      setHistory(data);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDownloadTemplate = (type: string) => {
    window.open(`/api/v1/csv/templates/${type.toLowerCase()}`, '_blank');
  };

  const handleExportData = (type: string) => {
    window.open(`/api/v1/csv/export/${type.toLowerCase()}`, '_blank');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
      setPreviewLoading(true);
      try {
        const preview = await api.previewCsv(selectedEntity, text);
        setPreviewResult(preview);
      } catch (err: any) {
        alert(err.message || 'CSV preview parsing failed');
      } finally {
        setPreviewLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!csvContent) return;
    setImporting(true);
    try {
      const res = await api.executeCsvImport(selectedEntity, csvContent, `${selectedEntity.toLowerCase()}_import.csv`);
      alert(`Import successful! ${res.importedRows} records ingested without data loss.`);
      setCsvContent('');
      setPreviewResult(null);
      fetchHistory();
    } catch (err: any) {
      alert(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">CSV Import & Export Center</h2>
        <p className="text-xs text-slate-400 mt-1">
          Atomic transactional batch ingestion with pre-import dry-run validation and line error diagnosis
        </p>
      </div>

      {/* Templates & Export Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { id: 'CLIENTS', label: 'Clients & Terms', desc: 'Company codes, billing models, rates' },
          { id: 'RECRUITERS', label: 'Recruiters & Costs', desc: 'Cost rates, hourly & salaried profiles' },
          { id: 'ROLES', label: 'Recruitment Roles', desc: 'Job titles, SLA targets, priorities' },
          { id: 'TIME_ENTRIES', label: 'Time Tracking', desc: 'Work dates, hours, task types' }
        ].map(item => (
          <div key={item.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-white">{item.label}</span>
              <FileSpreadsheet className="w-4 h-4 text-sky-400" />
            </div>
            <p className="text-xs text-slate-400">{item.desc}</p>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => handleDownloadTemplate(item.id)}
                className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg text-xs font-medium flex items-center justify-center gap-1 border border-slate-700"
              >
                <Download className="w-3 h-3" />
                <span>Template</span>
              </button>
              <button
                onClick={() => handleExportData(item.id)}
                className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center justify-center gap-1 border border-slate-700"
              >
                <Download className="w-3 h-3" />
                <span>Export</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Ingestion Console */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-semibold text-white">Batch Import Pipeline</h3>
            <p className="text-xs text-slate-400 mt-0.5">Select entity type, upload CSV file, preview validation, and execute</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedEntity}
              onChange={e => {
                setSelectedEntity(e.target.value);
                setPreviewResult(null);
                setCsvContent('');
              }}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
            >
              <option value="CLIENTS">Clients & Contract Terms</option>
              <option value="RECRUITERS">Recruiters & Cost Rates</option>
              <option value="ROLES">Recruitment Roles</option>
              <option value="TIME_ENTRIES">Time Entries</option>
              <option value="BILLING">Billing & Invoices</option>
            </select>
          </div>
        </div>

        {/* Upload Dropzone */}
        <div className="border-2 border-dashed border-slate-800 hover:border-sky-500/50 rounded-2xl p-6 text-center transition bg-slate-950/40">
          <Upload className="w-8 h-8 text-sky-400 mx-auto mb-2 opacity-80" />
          <h4 className="text-sm font-semibold text-white">Choose a CSV file to validate</h4>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Supports UTF-8 formatted CSV files with header matching standard template
          </p>

          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium border border-slate-700 transition">
            <span>Select Local File</span>
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        {/* Validation Dry-Run Results */}
        {previewLoading && (
          <div className="p-4 text-center text-xs text-slate-400">Parsing and running schema dry-run checks...</div>
        )}

        {previewResult && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs">
              <div className="flex items-center gap-4">
                <span className="text-slate-300">
                  Total Rows: <strong className="text-white font-mono">{previewResult.totalRows}</strong>
                </span>
                <span className="text-emerald-400">
                  Valid Rows: <strong className="font-mono">{previewResult.validRows}</strong>
                </span>
                <span className="text-rose-400">
                  Errors Detected: <strong className="font-mono">{previewResult.invalidRows}</strong>
                </span>
              </div>

              <button
                onClick={handleExecuteImport}
                disabled={previewResult.invalidRows > 0 || importing}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium transition shadow-md shadow-emerald-600/30 disabled:opacity-40"
              >
                {importing ? 'Processing Ingestion...' : 'Execute Transactional Import'}
              </button>
            </div>

            {/* Error Diagnosis List */}
            {previewResult.errors.length > 0 && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2">
                <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4" />
                  <span>Validation Blockers — Fix errors before importing</span>
                </div>
                <div className="divide-y divide-rose-500/10 max-h-40 overflow-y-auto text-xs">
                  {previewResult.errors.map((err: any, idx: number) => (
                    <div key={idx} className="py-1.5 text-rose-300">
                      Line <strong className="font-mono">{err.rowNumber}</strong>: {err.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Import History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Import History & Audit Trail</h3>
          <span className="text-xs text-slate-400 font-mono">{history.length} Jobs Processed</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Date & Time</th>
                <th className="py-2.5 px-4">Entity</th>
                <th className="py-2.5 px-4">Filename</th>
                <th className="py-2.5 px-4">Imported / Total</th>
                <th className="py-2.5 px-4">Operator</th>
                <th className="py-2.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {history.map(job => (
                <tr key={job.id} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 font-mono text-slate-300">
                    {new Date(job.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-white font-semibold">{job.entityType}</td>
                  <td className="py-2.5 px-4 text-slate-400">{job.filename}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-300">
                    {job.importedRows} / {job.totalRows}
                  </td>
                  <td className="py-2.5 px-4 text-slate-400">{job.performedBy}</td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded font-mono font-medium ${
                        job.status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {job.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

