import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { authController } from '../controllers/auth.controller';
import { clientController } from '../controllers/client.controller';
import { roleController } from '../controllers/role.controller';
import { timeController } from '../controllers/time.controller';
import { costController } from '../controllers/cost.controller';
import { marginController } from '../controllers/margin.controller';
import { slaController } from '../controllers/sla.controller';
import { workloadController } from '../controllers/workload.controller';
import { alertController } from '../controllers/alert.controller';
import { billingController } from '../controllers/billing.controller';
import { csvController } from '../controllers/csv.controller';
import { reportController } from '../controllers/report.controller';
import { settingsController } from '../controllers/settings.controller';
import { auditController } from '../controllers/audit.controller';

const router = Router();

// Public auth routes
router.post('/auth/login', (req, res, next) => authController.login(req, res).catch(next));
router.post('/auth/logout', (req, res, next) => authController.logout(req, res).catch(next));

// All subsequent routes require authentication
router.use(authenticateToken);

// User profile & management
router.get('/auth/me', (req, res, next) => authController.getMe(req, res).catch(next));
router.get('/users', requireRole('OWNER', 'MANAGER', 'FINANCE'), (req, res, next) => authController.getUsers(req, res).catch(next));
router.post('/users', requireRole('OWNER'), (req, res, next) => authController.createUser(req, res).catch(next));
router.put('/users/:id/assignments', requireRole('OWNER', 'MANAGER'), (req, res, next) => authController.updateUserAssignments(req, res).catch(next));

// Clients & Contracts
router.get('/clients', (req, res, next) => clientController.getClients(req, res).catch(next));
router.get('/clients/:id', (req, res, next) => clientController.getClientById(req, res).catch(next));
router.post('/clients', requireRole('OWNER', 'MANAGER'), (req, res, next) => clientController.createClient(req, res).catch(next));
router.put('/clients/:id', requireRole('OWNER', 'MANAGER'), (req, res, next) => clientController.updateClient(req, res).catch(next));
router.post('/clients/:id/terms', requireRole('OWNER', 'FINANCE'), (req, res, next) => clientController.createContractTerm(req, res).catch(next));

// Recruitment Roles & SLA
router.get('/roles', (req, res, next) => roleController.getRoles(req, res).catch(next));
router.get('/roles/:id', (req, res, next) => roleController.getRoleById(req, res).catch(next));
router.post('/roles', requireRole('OWNER', 'MANAGER', 'RECRUITER'), (req, res, next) => roleController.createRole(req, res).catch(next));
router.post('/roles/:id/stage', (req, res, next) => roleController.updateRoleStage(req, res).catch(next));
router.post('/roles/:id/sla-extension', requireRole('OWNER', 'MANAGER'), (req, res, next) => roleController.requestSlaExtension(req, res).catch(next));

// Time Tracking & Approvals
router.get('/time-entries', (req, res, next) => timeController.getTimeEntries(req, res).catch(next));
router.post('/time-entries', (req, res, next) => timeController.createTimeEntry(req, res).catch(next));
router.put('/time-entries/:id', (req, res, next) => timeController.updateTimeEntry(req, res).catch(next));
router.post('/time-entries/batch-approve', requireRole('OWNER', 'MANAGER'), (req, res, next) => timeController.batchApproveEntries(req, res).catch(next));
router.post('/time-entries/:id/adjustment', requireRole('OWNER', 'MANAGER', 'FINANCE'), (req, res, next) => timeController.createTimeAdjustment(req, res).catch(next));

// Recruiter Cost Management
router.get('/costs', requireRole('OWNER', 'FINANCE'), (req, res, next) => costController.getCostProfiles(req, res).catch(next));
router.post('/costs', requireRole('OWNER', 'FINANCE'), (req, res, next) => costController.createCostProfile(req, res).catch(next));

// Margins & Financial Calculations
router.get('/margins/summary', requireRole('OWNER', 'MANAGER', 'FINANCE'), (req, res, next) => marginController.getSummary(req, res).catch(next));
router.get('/margins/clients', requireRole('OWNER', 'MANAGER', 'FINANCE'), (req, res, next) => marginController.getClientMargins(req, res).catch(next));
router.get('/margins/clients/:id/drilldown', requireRole('OWNER', 'MANAGER', 'FINANCE'), (req, res, next) => marginController.getClientDrilldown(req, res).catch(next));

// SLA Engine & Risk Monitoring
router.get('/sla/summary', (req, res, next) => slaController.getSummary(req, res).catch(next));
router.post('/sla/recalculate', (req, res, next) => slaController.recalculateAndScanAlerts(req, res).catch(next));

// Recruiter Workload Balancer
router.get('/workload/overview', requireRole('OWNER', 'MANAGER'), (req, res, next) => workloadController.getOverview(req, res).catch(next));
router.post('/workload/reassign', requireRole('OWNER', 'MANAGER'), (req, res, next) => workloadController.reassignRole(req, res).catch(next));

// Alerts & Notifications
router.get('/alerts', (req, res, next) => alertController.getAlerts(req, res).catch(next));
router.post('/alerts/:id/resolve', (req, res, next) => alertController.resolveAlert(req, res).catch(next));
router.post('/alerts/:id/reopen', (req, res, next) => alertController.reopenAlert(req, res).catch(next));
router.post('/alerts/test-dispatch', requireRole('OWNER', 'MANAGER'), (req, res, next) => alertController.testDispatch(req, res).catch(next));

// Billing & Financial Reconciliation
router.get('/billing/invoices', requireRole('OWNER', 'FINANCE'), (req, res, next) => billingController.getInvoices(req, res).catch(next));
router.post('/billing/invoices', requireRole('OWNER', 'FINANCE'), (req, res, next) => billingController.createInvoice(req, res).catch(next));
router.post('/billing/hires', requireRole('OWNER', 'FINANCE', 'MANAGER'), (req, res, next) => billingController.recordBillableHire(req, res).catch(next));
router.post('/billing/adjustments', requireRole('OWNER', 'FINANCE'), (req, res, next) => billingController.recordFinancialAdjustment(req, res).catch(next));
router.get('/billing/reconciliation', requireRole('OWNER', 'FINANCE'), (req, res, next) => billingController.getReconciliation(req, res).catch(next));

// CSV Import & Export
router.get('/csv/templates/:type', (req, res, next) => csvController.getTemplate(req, res).catch(next));
router.post('/csv/preview/:type', (req, res, next) => csvController.previewImport(req, res).catch(next));
router.post('/csv/execute/:type', requireRole('OWNER', 'MANAGER', 'FINANCE'), (req, res, next) => csvController.executeImport(req, res).catch(next));
router.get('/csv/history', (req, res, next) => csvController.getHistory(req, res).catch(next));
router.get('/csv/export/:type', requireRole('OWNER', 'MANAGER', 'FINANCE'), (req, res, next) => csvController.exportData(req, res).catch(next));

// Weekly Reports
router.get('/reports/weekly', requireRole('OWNER', 'FINANCE', 'MANAGER'), (req, res, next) => reportController.getWeeklyReport(req, res).catch(next));
router.post('/reports/weekly/send', requireRole('OWNER'), (req, res, next) => reportController.sendWeeklyReport(req, res).catch(next));

// Settings
router.get('/settings', requireRole('OWNER'), (req, res, next) => settingsController.getSettings(req, res).catch(next));
router.put('/settings', requireRole('OWNER'), (req, res, next) => settingsController.updateSettings(req, res).catch(next));

// Audit Logs
router.get('/audit-logs', requireRole('OWNER', 'FINANCE'), (req, res, next) => auditController.getAuditLogs(req, res).catch(next));

export default router;

