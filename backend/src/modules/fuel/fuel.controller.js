const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./fuel.service');
const { recordAuditLog } = require('../../middleware/auditLog.middleware');

const listStations = asyncHandler(async (req, res) => res.status(200).json(new ApiResponse(200, await service.listStations(req.query))));
const createStation = asyncHandler(async (req, res) => {
  const s = await service.createStation(req.body);
  await recordAuditLog({ req, action: 'CREATE', module: 'fuel', entityId: s.id, description: `Added fuel station ${s.name}` });
  res.status(201).json(new ApiResponse(201, s, 'Fuel station created'));
});
const updateStation = asyncHandler(async (req, res) => {
  const s = await service.updateStation(req.params.id, req.body);
  await recordAuditLog({ req, action: 'UPDATE', module: 'fuel', entityId: s.id, description: `Updated fuel station ${s.name}` });
  res.status(200).json(new ApiResponse(200, s, 'Fuel station updated'));
});
const deleteStation = asyncHandler(async (req, res) => {
  await service.deleteStation(req.params.id);
  await recordAuditLog({ req, action: 'DELETE', module: 'fuel', entityId: req.params.id, description: 'Deleted fuel station' });
  res.status(200).json(new ApiResponse(200, null, 'Fuel station deleted'));
});

const listTransactions = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listTransactions(req.query);
  res.status(200).json(new ApiResponse(200, items, 'Fuel transactions retrieved', meta));
});
const createTransaction = asyncHandler(async (req, res) => {
  const t = await service.createTransaction(req.body, req.body.issuedById || null);
  await recordAuditLog({ req, action: 'CREATE', module: 'fuel', entityId: t.id, description: `Issued ${t.quantity}L of fuel` });
  res.status(201).json(new ApiResponse(201, t, 'Fuel transaction recorded'));
});

const listPurchases = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listPurchases(req.query);
  res.status(200).json(new ApiResponse(200, items, 'Fuel purchases retrieved', meta));
});
const createPurchase = asyncHandler(async (req, res) => {
  const p = await service.createPurchase(req.body);
  await recordAuditLog({ req, action: 'CREATE', module: 'fuel', entityId: p.id, description: `Purchased ${p.quantity}L of fuel` });
  res.status(201).json(new ApiResponse(201, p, 'Fuel purchase recorded'));
});

module.exports = { listStations, createStation, updateStation, deleteStation, listTransactions, createTransaction, listPurchases, createPurchase };
