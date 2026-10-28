const API_BASE = '/api/v1';

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('agency_tracker_token');
  }

  public setToken(token: string) {
    localStorage.setItem('agency_tracker_token', token);
  }

  public clearToken() {
    localStorage.removeItem('agency_tracker_token');
  }

  public async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>)
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (response.status === 401) {
      this.clearToken();
      window.dispatchEvent(new Event('auth:unauthorized'));
    }

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: response.statusText };
      }
      throw new Error(errorData.message || 'API request failed');
    }

    return response.json();
  }

  // Auth
  login = (credentials: { email: string; password: string }) =>
    this.request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
  getMe = () => this.request('/auth/me');
  logout = () => this.request('/auth/logout', { method: 'POST' });
  getUsers = () => this.request('/users');
  createUser = (data: any) => this.request('/users', { method: 'POST', body: JSON.stringify(data) });
  updateUserAssignments = (userId: string, clientIds: string[]) =>
    this.request(`/users/${userId}/assignments`, { method: 'PUT', body: JSON.stringify({ clientIds }) });

  // Clients
  getClients = (params?: { status?: string; billingModel?: string; search?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return this.request(`/clients${q ? `?${q}` : ''}`);
  };
  getClientById = (id: string) => this.request(`/clients/${id}`);
  createClient = (data: any) => this.request('/clients', { method: 'POST', body: JSON.stringify(data) });
  updateClient = (id: string, data: any) => this.request(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  createContractTerm = (clientId: string, data: any) =>
    this.request(`/clients/${clientId}/terms`, { method: 'POST', body: JSON.stringify(data) });

  // Roles
  getRoles = (params?: any) => {
    const q = new URLSearchParams(params).toString();
    return this.request(`/roles${q ? `?${q}` : ''}`);
  };
  getRoleById = (id: string) => this.request(`/roles/${id}`);
  createRole = (data: any) => this.request('/roles', { method: 'POST', body: JSON.stringify(data) });
  updateRoleStage = (id: string, newStage: string, notes?: string) =>
    this.request(`/roles/${id}/stage`, { method: 'POST', body: JSON.stringify({ newStage, notes }) });
  extendSla = (id: string, addedDays: number, reason: string) =>
    this.request(`/roles/${id}/sla-extension`, { method: 'POST', body: JSON.stringify({ addedDays, reason }) });

  // Time
  getTimeEntries = (params?: any) => {
    const q = new URLSearchParams(params).toString();
    return this.request(`/time-entries${q ? `?${q}` : ''}`);
  };
  createTimeEntry = (data: any) => this.request('/time-entries', { method: 'POST', body: JSON.stringify(data) });
  updateTimeEntry = (id: string, data: any) => this.request(`/time-entries/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  batchApproveTime = (entryIds: string[], action: 'APPROVE' | 'REJECT', rejectionReason?: string) =>
    this.request('/time-entries/batch-approve', { method: 'POST', body: JSON.stringify({ entryIds, action, rejectionReason }) });
  adjustTime = (id: string, adjustedHours: number, reason: string) =>
    this.request(`/time-entries/${id}/adjustment`, { method: 'POST', body: JSON.stringify({ adjustedHours, reason }) });

  // Margins
  getMarginSummary = (params?: { startDate?: string; endDate?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return this.request(`/margins/summary${q ? `?${q}` : ''}`);
  };
  getClientMargins = (params?: any) => {
    const q = new URLSearchParams(params).toString();
    return this.request(`/margins/clients${q ? `?${q}` : ''}`);
  };
  getClientDrilldown = (id: string, params?: any) => {
    const q = new URLSearchParams(params).toString();
    return this.request(`/margins/clients/${id}/drilldown${q ? `?${q}` : ''}`);
  };

  // SLA
  getSlaSummary = () => this.request('/sla/summary');
  scanSlaAlerts = () => this.request('/sla/recalculate', { method: 'POST' });

  // Workload
  getWorkloadOverview = () => this.request('/workload/overview');
  reassignRole = (roleId: string, newRecruiterId: string, reason: string) =>
    this.request('/workload/reassign', { method: 'POST', body: JSON.stringify({ roleId, newRecruiterId, reason }) });

  // Alerts
  getAlerts = (params?: any) => {
    const q = new URLSearchParams(params).toString();
    return this.request(`/alerts${q ? `?${q}` : ''}`);
  };
  resolveAlert = (id: string, resolutionNotes: string) =>
    this.request(`/alerts/${id}/resolve`, { method: 'POST', body: JSON.stringify({ resolutionNotes }) });
  reopenAlert = (id: string) => this.request(`/alerts/${id}/reopen`, { method: 'POST' });
  testDispatchAlert = (alertId: string, channel: string) =>
    this.request('/alerts/test-dispatch', { method: 'POST', body: JSON.stringify({ alertId, channel }) });

  // Billing & Reconciliation
  getInvoices = (params?: any) => {
    const q = new URLSearchParams(params).toString();
    return this.request(`/billing/invoices${q ? `?${q}` : ''}`);
  };
  createInvoice = (data: any) => this.request('/billing/invoices', { method: 'POST', body: JSON.stringify(data) });
  recordBillableHire = (data: any) => this.request('/billing/hires', { method: 'POST', body: JSON.stringify(data) });
  recordFinancialAdjustment = (data: any) => this.request('/billing/adjustments', { method: 'POST', body: JSON.stringify(data) });
  getReconciliation = (params?: any) => {
    const q = new URLSearchParams(params).toString();
    return this.request(`/billing/reconciliation${q ? `?${q}` : ''}`);
  };

  // CSV
  previewCsv = (type: string, csvContent: string) =>
    this.request(`/csv/preview/${type}`, { method: 'POST', body: JSON.stringify({ csvContent }) });
  executeCsvImport = (type: string, csvContent: string, filename: string) =>
    this.request(`/csv/execute/${type}`, { method: 'POST', body: JSON.stringify({ csvContent, filename }) });
  getCsvHistory = () => this.request('/csv/history');

  // Reports
  getWeeklyReport = () => this.request('/reports/weekly');
  sendWeeklyReport = (recipientEmails?: string) =>
    this.request('/reports/weekly/send', { method: 'POST', body: JSON.stringify({ recipientEmails }) });

  // Settings
  getSettings = () => this.request('/settings');
  updateSettings = (data: any) => this.request('/settings', { method: 'PUT', body: JSON.stringify(data) });

  // Audit Logs
  getAuditLogs = (params?: any) => {
    const q = new URLSearchParams(params).toString();
    return this.request(`/audit-logs${q ? `?${q}` : ''}`);
  };
}

export const api = new ApiClient();

