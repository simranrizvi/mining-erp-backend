const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./reports.service');
const { exportToExcel, exportToPDF } = require('./reportExport.util');
const { recordAuditLog } = require('../../middleware/auditLog.middleware');

/** Generic handler: fetches rows via the given service function, then
 * responds as JSON, Excel, or PDF depending on ?format=. */
function buildReportHandler(fetchRows, title, filename) {
  return asyncHandler(async (req, res) => {
    const rows = await fetchRows(req.query);
    const format = req.query.format || 'json';

    if (format === 'excel') {
      await recordAuditLog({ req, action: 'READ', module: 'reports', description: `Exported ${title} as Excel` });
      return exportToExcel(res, { title, rows, filename });
    }
    if (format === 'pdf') {
      await recordAuditLog({ req, action: 'READ', module: 'reports', description: `Exported ${title} as PDF` });
      return exportToPDF(res, { title, rows, filename });
    }
    res.status(200).json(new ApiResponse(200, rows, `${title} generated`, { count: rows.length }));
  });
}

module.exports = {
  production: buildReportHandler(service.productionReport, 'Production Report', 'production-report'),
  attendance: buildReportHandler(service.attendanceReport, 'Attendance Report', 'attendance-report'),
  inventoryValuation: buildReportHandler(service.inventoryValuationReport, 'Inventory Valuation Report', 'inventory-valuation-report'),
  financialSummary: buildReportHandler(service.financialSummaryReport, 'Financial Summary Report', 'financial-summary-report'),
  equipmentUtilization: buildReportHandler(service.equipmentUtilizationReport, 'Equipment Utilization Report', 'equipment-utilization-report'),
};
