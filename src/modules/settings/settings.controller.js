const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./settings.service');
const { recordAuditLog } = require('../../middleware/auditLog.middleware');

const getCompany = asyncHandler(async (req, res) => res.status(200).json(new ApiResponse(200, await service.getCompany())));
const updateCompany = asyncHandler(async (req, res) => {
  const company = await service.updateCompany(req.body);
  await recordAuditLog({ req, action: 'UPDATE', module: 'settings', description: 'Updated company profile' });
  res.status(200).json(new ApiResponse(200, company, 'Company profile updated'));
});

const listSettings = asyncHandler(async (req, res) => res.status(200).json(new ApiResponse(200, await service.listSettings(req.query.category))));
const upsertSetting = asyncHandler(async (req, res) => {
  const setting = await service.upsertSetting(req.body);
  await recordAuditLog({ req, action: 'UPDATE', module: 'settings', description: `Set system setting "${setting.key}"` });
  res.status(200).json(new ApiResponse(200, setting, 'Setting saved'));
});
const deleteSetting = asyncHandler(async (req, res) => {
  await service.deleteSetting(req.params.key);
  await recordAuditLog({ req, action: 'DELETE', module: 'settings', description: `Deleted system setting "${req.params.key}"` });
  res.status(200).json(new ApiResponse(200, null, 'Setting deleted'));
});

const listDepartments = asyncHandler(async (req, res) => res.status(200).json(new ApiResponse(200, await service.listDepartments())));
const createDepartment = asyncHandler(async (req, res) => {
  const dept = await service.createDepartment(req.body);
  res.status(201).json(new ApiResponse(201, dept, 'Department created'));
});
const deleteDepartment = asyncHandler(async (req, res) => {
  await service.deleteDepartment(req.params.id);
  res.status(200).json(new ApiResponse(200, null, 'Department deleted'));
});

const listLeaveTypes = asyncHandler(async (req, res) => res.status(200).json(new ApiResponse(200, await service.listLeaveTypes())));
const createLeaveType = asyncHandler(async (req, res) => {
  const lt = await service.createLeaveType(req.body);
  res.status(201).json(new ApiResponse(201, lt, 'Leave type created'));
});
const deleteLeaveType = asyncHandler(async (req, res) => {
  await service.deleteLeaveType(req.params.id);
  res.status(200).json(new ApiResponse(200, null, 'Leave type deleted'));
});

const listShifts = asyncHandler(async (req, res) => res.status(200).json(new ApiResponse(200, await service.listShifts(req.query))));
const createShift = asyncHandler(async (req, res) => {
  const shift = await service.createShift(req.body);
  res.status(201).json(new ApiResponse(201, shift, 'Shift created'));
});
const deleteShift = asyncHandler(async (req, res) => {
  await service.deleteShift(req.params.id);
  res.status(200).json(new ApiResponse(200, null, 'Shift deleted'));
});

module.exports = {
  getCompany, updateCompany, listSettings, upsertSetting, deleteSetting,
  listDepartments, createDepartment, deleteDepartment,
  listLeaveTypes, createLeaveType, deleteLeaveType,
  listShifts, createShift, deleteShift,
};
