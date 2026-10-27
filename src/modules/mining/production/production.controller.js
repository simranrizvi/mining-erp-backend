const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/ApiResponse');
const service = require('./production.service');
const { recordAuditLog } = require('../../../middleware/auditLog.middleware');

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listProduction(req.query);
  res.status(200).json(new ApiResponse(200, items, 'Production records retrieved', meta));
});

const byMaterial = asyncHandler(async (req, res) => {
  const data = await service.productionByMaterial(req.query);
  res.status(200).json(new ApiResponse(200, data));
});

const getById = asyncHandler(async (req, res) => {
  const record = await service.getProductionById(req.params.id);
  res.status(200).json(new ApiResponse(200, record));
});

const create = asyncHandler(async (req, res) => {
  const record = await service.createProduction(req.body);
  await recordAuditLog({
    req, action: 'CREATE', module: 'mining.production', entityId: record.id,
    description: `Logged ${record.quantity}${record.unit} of ${record.materialType} at ${record.mineSite.name}`,
  });
  res.status(201).json(new ApiResponse(201, record, 'Production logged successfully'));
});

const update = asyncHandler(async (req, res) => {
  const before = await service.getProductionById(req.params.id);
  const record = await service.updateProduction(req.params.id, req.body);
  await recordAuditLog({ req, action: 'UPDATE', module: 'mining.production', entityId: record.id, description: 'Updated production record', oldValue: before, newValue: record });
  res.status(200).json(new ApiResponse(200, record, 'Production record updated'));
});

const remove = asyncHandler(async (req, res) => {
  const before = await service.getProductionById(req.params.id);
  await service.deleteProduction(req.params.id);
  await recordAuditLog({ req, action: 'DELETE', module: 'mining.production', entityId: req.params.id, description: 'Deleted production record', oldValue: before });
  res.status(200).json(new ApiResponse(200, null, 'Production record deleted'));
});

module.exports = { list, byMaterial, getById, create, update, remove };
