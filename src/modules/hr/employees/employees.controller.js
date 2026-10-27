const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/ApiResponse');
const service = require('./employees.service');
const { recordAuditLog } = require('../../../middleware/auditLog.middleware');

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listEmployees(req.query);
  res.status(200).json(new ApiResponse(200, items, 'Employees retrieved', meta));
});

const getById = asyncHandler(async (req, res) => {
  const employee = await service.getEmployeeById(req.params.id);
  res.status(200).json(new ApiResponse(200, employee));
});

const create = asyncHandler(async (req, res) => {
  const employee = await service.createEmployee(req.body);
  await recordAuditLog({
    req, action: 'CREATE', module: 'hr.employees', entityId: employee.id,
    description: `Onboarded employee ${employee.firstName} ${employee.lastName}`, newValue: employee,
  });
  res.status(201).json(new ApiResponse(201, employee, 'Employee created successfully'));
});

const update = asyncHandler(async (req, res) => {
  const before = await service.getEmployeeById(req.params.id);
  const employee = await service.updateEmployee(req.params.id, req.body);
  await recordAuditLog({
    req, action: 'UPDATE', module: 'hr.employees', entityId: employee.id,
    description: `Updated employee ${employee.firstName} ${employee.lastName}`, oldValue: before, newValue: employee,
  });
  res.status(200).json(new ApiResponse(200, employee, 'Employee updated successfully'));
});

const remove = asyncHandler(async (req, res) => {
  const before = await service.getEmployeeById(req.params.id);
  await service.deleteEmployee(req.params.id);
  await recordAuditLog({
    req, action: 'DELETE', module: 'hr.employees', entityId: req.params.id,
    description: `Removed employee ${before.firstName} ${before.lastName}`, oldValue: before,
  });
  res.status(200).json(new ApiResponse(200, null, 'Employee deleted successfully'));
});

const uploadPhoto = asyncHandler(async (req, res) => {
  if (!req.file) throw require('../../../utils/ApiError').badRequest('No photo file uploaded.');
  const photoUrl = `/uploads/employees/${req.file.filename}`;
  const employee = await service.updatePhoto(req.params.id, photoUrl);
  await recordAuditLog({
    req, action: 'UPDATE', module: 'hr.employees', entityId: employee.id,
    description: `Updated photo for employee ${employee.firstName} ${employee.lastName}`,
  });
  res.status(200).json(new ApiResponse(200, employee, 'Photo uploaded successfully'));
});

module.exports = { list, getById, create, update, remove, uploadPhoto };
