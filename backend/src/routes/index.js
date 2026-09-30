const express = require('express');

const authRoutes = require('../modules/auth/auth.routes');
const usersRoutes = require('../modules/users/users.routes');
const rolesRoutes = require('../modules/roles/roles.routes');
const auditLogsRoutes = require('../modules/auditlogs/auditlogs.routes');
const mineSitesRoutes = require('../modules/minesites/minesites.routes');
const employeesRoutes = require('../modules/hr/employees/employees.routes');
const attendanceRoutes = require('../modules/hr/attendance/attendance.routes');
const leaveRoutes = require('../modules/hr/leave/leave.routes');
const productionRoutes = require('../modules/mining/production/production.routes');
const equipmentRoutes = require('../modules/equipment/equipment.routes');
const vehiclesRoutes = require('../modules/vehicles/vehicles.routes');
const maintenanceRoutes = require('../modules/maintenance/maintenance.routes');
const inventoryRoutes = require('../modules/inventory/inventory.routes');
const procurementRoutes = require('../modules/procurement/procurement.routes');
const fuelRoutes = require('../modules/fuel/fuel.routes');
const financeRoutes = require('../modules/finance/finance.routes');
const reportsRoutes = require('../modules/reports/reports.routes');
const settingsRoutes = require('../modules/settings/settings.routes');
const dashboardRoutes = require('../modules/dashboard/dashboard.routes');

const router = express.Router();

router.get('/health', (req, res) => res.status(200).json({ success: true, message: 'Mining ERP API is healthy', timestamp: new Date().toISOString() }));

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/roles', rolesRoutes);
router.use('/audit-logs', auditLogsRoutes);
router.use('/mine-sites', mineSitesRoutes);
router.use('/hr/employees', employeesRoutes);
router.use('/hr/attendance', attendanceRoutes);
router.use('/hr/leave', leaveRoutes);
router.use('/mining/production', productionRoutes);
router.use('/equipment', equipmentRoutes);
router.use('/vehicles', vehiclesRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/procurement', procurementRoutes);
router.use('/fuel', fuelRoutes);
router.use('/finance', financeRoutes);
router.use('/reports', reportsRoutes);
router.use('/settings', settingsRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router;
