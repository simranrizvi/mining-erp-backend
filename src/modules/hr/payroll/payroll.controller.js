const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/ApiResponse');
const service = require('./payroll.service');
const { recordAuditLog } = require('../../../middleware/auditLog.middleware');

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listPayrolls(req.query);
  res.status(200).json(new ApiResponse(200, items, 'Payroll records retrieved', meta));
});

const summary = asyncHandler(async (req, res) => {
  const data = await service.getSummary(req.query);
  res.status(200).json(new ApiResponse(200, data));
});

const getById = asyncHandler(async (req, res) => {
  const payroll = await service.getPayrollById(req.params.id);
  res.status(200).json(new ApiResponse(200, payroll));
});

const create = asyncHandler(async (req, res) => {
  const payroll = await service.createPayroll(req.body);
  await recordAuditLog({
    req, action: 'CREATE', module: 'hr.payroll', entityId: payroll.id,
    description: `Created payroll for ${payroll.employee.firstName} ${payroll.employee.lastName} (${payroll.month}/${payroll.year})`,
    newValue: payroll,
  });
  res.status(201).json(new ApiResponse(201, payroll, 'Payroll record created'));
});

const generate = asyncHandler(async (req, res) => {
  const result = await service.generateDrafts(req.body);
  await recordAuditLog({
    req, action: 'CREATE', module: 'hr.payroll',
    description: `Generated ${result.created} draft payroll records for ${req.body.month}/${req.body.year}`,
  });
  res.status(201).json(new ApiResponse(201, result, `Generated ${result.created} draft payroll records`));
});

const update = asyncHandler(async (req, res) => {
  const before = await service.getPayrollById(req.params.id);
  const payroll = await service.updatePayroll(req.params.id, req.body);
  await recordAuditLog({
    req, action: 'UPDATE', module: 'hr.payroll', entityId: payroll.id,
    description: `Updated payroll (${payroll.month}/${payroll.year})`, oldValue: before, newValue: payroll,
  });
  res.status(200).json(new ApiResponse(200, payroll, 'Payroll record updated'));
});

const action = asyncHandler(async (req, res) => {
  const payroll = await service.actionPayroll(req.params.id, req.body);
  await recordAuditLog({
    req, action: req.body.status === 'paid' ? 'UPDATE' : 'UPDATE', module: 'hr.payroll', entityId: payroll.id,
    description: `Payroll (${payroll.month}/${payroll.year}) marked as ${payroll.status}`,
  });
  res.status(200).json(new ApiResponse(200, payroll, `Payroll marked as ${payroll.status}`));
});

const remove = asyncHandler(async (req, res) => {
  const before = await service.getPayrollById(req.params.id);
  await service.deletePayroll(req.params.id);
  await recordAuditLog({
    req, action: 'DELETE', module: 'hr.payroll', entityId: req.params.id,
    description: `Deleted draft payroll (${before.month}/${before.year})`, oldValue: before,
  });
  res.status(200).json(new ApiResponse(200, null, 'Payroll record deleted'));
});

module.exports = { list, summary, getById, create, generate, update, action, remove };
