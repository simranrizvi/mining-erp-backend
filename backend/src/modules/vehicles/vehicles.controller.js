const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./vehicles.service');
const { recordAuditLog } = require('../../middleware/auditLog.middleware');

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listVehicles(req.query);
  res.status(200).json(new ApiResponse(200, items, 'Vehicles retrieved', meta));
});

const getById = asyncHandler(async (req, res) => {
  const v = await service.getVehicleById(req.params.id);
  res.status(200).json(new ApiResponse(200, v));
});

const create = asyncHandler(async (req, res) => {
  const v = await service.createVehicle(req.body);
  await recordAuditLog({ req, action: 'CREATE', module: 'vehicles', entityId: v.id, description: `Added vehicle ${v.name} (${v.plateNumber})`, newValue: v });
  res.status(201).json(new ApiResponse(201, v, 'Vehicle added successfully'));
});

const update = asyncHandler(async (req, res) => {
  const before = await service.getVehicleById(req.params.id);
  const v = await service.updateVehicle(req.params.id, req.body);
  await recordAuditLog({ req, action: 'UPDATE', module: 'vehicles', entityId: v.id, description: `Updated vehicle ${v.name}`, oldValue: before, newValue: v });
  res.status(200).json(new ApiResponse(200, v, 'Vehicle updated successfully'));
});

const changeStatus = asyncHandler(async (req, res) => {
  const v = await service.changeStatus(req.params.id, req.body.status);
  await recordAuditLog({ req, action: 'UPDATE', module: 'vehicles', entityId: v.id, description: `Changed status of ${v.name} to ${v.status}` });
  res.status(200).json(new ApiResponse(200, v, 'Vehicle status updated'));
});

const remove = asyncHandler(async (req, res) => {
  const before = await service.getVehicleById(req.params.id);
  await service.deleteVehicle(req.params.id);
  await recordAuditLog({ req, action: 'DELETE', module: 'vehicles', entityId: req.params.id, description: `Deleted vehicle ${before.name}`, oldValue: before });
  res.status(200).json(new ApiResponse(200, null, 'Vehicle deleted successfully'));
});

module.exports = { list, getById, create, update, changeStatus, remove };
