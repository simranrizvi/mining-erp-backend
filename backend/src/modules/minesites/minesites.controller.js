const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./minesites.service');
const { recordAuditLog } = require('../../middleware/auditLog.middleware');

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listMineSites(req.query);
  res.status(200).json(new ApiResponse(200, items, 'Mine sites retrieved', meta));
});

const getById = asyncHandler(async (req, res) => {
  const site = await service.getMineSiteById(req.params.id);
  res.status(200).json(new ApiResponse(200, site));
});

const create = asyncHandler(async (req, res) => {
  const site = await service.createMineSite(req.body);
  await recordAuditLog({ req, action: 'CREATE', module: 'mine_sites', entityId: site.id, description: `Created mine site ${site.name}`, newValue: site });
  res.status(201).json(new ApiResponse(201, site, 'Mine site created successfully'));
});

const update = asyncHandler(async (req, res) => {
  const before = await service.getMineSiteById(req.params.id);
  const site = await service.updateMineSite(req.params.id, req.body);
  await recordAuditLog({ req, action: 'UPDATE', module: 'mine_sites', entityId: site.id, description: `Updated mine site ${site.name}`, oldValue: before, newValue: site });
  res.status(200).json(new ApiResponse(200, site, 'Mine site updated successfully'));
});

const remove = asyncHandler(async (req, res) => {
  const before = await service.getMineSiteById(req.params.id);
  await service.deleteMineSite(req.params.id);
  await recordAuditLog({ req, action: 'DELETE', module: 'mine_sites', entityId: req.params.id, description: `Deleted mine site ${before.name}`, oldValue: before });
  res.status(200).json(new ApiResponse(200, null, 'Mine site deleted successfully'));
});

module.exports = { list, getById, create, update, remove };
