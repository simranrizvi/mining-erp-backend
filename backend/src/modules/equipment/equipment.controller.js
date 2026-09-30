const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./equipment.service');
const { recordAuditLog } = require('../../middleware/auditLog.middleware');

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listEquipment(req.query);
  res.status(200).json(new ApiResponse(200, items, 'Equipment retrieved', meta));
});

const utilization = asyncHandler(async (req, res) => {
  const data = await service.utilizationSummary(req.query);
  res.status(200).json(new ApiResponse(200, data));
});

const getById = asyncHandler(async (req, res) => {
  const eq = await service.getEquipmentById(req.params.id);
  res.status(200).json(new ApiResponse(200, eq));
});

const create = asyncHandler(async (req, res) => {
  const eq = await service.createEquipment(req.body);
  await recordAuditLog({ req, action: 'CREATE', module: 'equipment', entityId: eq.id, description: `Added equipment ${eq.name}`, newValue: eq });
  res.status(201).json(new ApiResponse(201, eq, 'Equipment added successfully'));
});

const update = asyncHandler(async (req, res) => {
  const before = await service.getEquipmentById(req.params.id);
  const eq = await service.updateEquipment(req.params.id, req.body);
  await recordAuditLog({ req, action: 'UPDATE', module: 'equipment', entityId: eq.id, description: `Updated equipment ${eq.name}`, oldValue: before, newValue: eq });
  res.status(200).json(new ApiResponse(200, eq, 'Equipment updated successfully'));
});

const changeStatus = asyncHandler(async (req, res) => {
  const eq = await service.changeStatus(req.params.id, req.body.status);
  await recordAuditLog({ req, action: 'UPDATE', module: 'equipment', entityId: eq.id, description: `Changed status of ${eq.name} to ${eq.status}` });
  res.status(200).json(new ApiResponse(200, eq, 'Equipment status updated'));
});

const remove = asyncHandler(async (req, res) => {
  const before = await service.getEquipmentById(req.params.id);
  await service.deleteEquipment(req.params.id);
  await recordAuditLog({ req, action: 'DELETE', module: 'equipment', entityId: req.params.id, description: `Deleted equipment ${before.name}`, oldValue: before });
  res.status(200).json(new ApiResponse(200, null, 'Equipment deleted successfully'));
});

module.exports = { list, utilization, getById, create, update, changeStatus, remove };
