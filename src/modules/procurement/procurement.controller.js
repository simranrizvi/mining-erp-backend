const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./procurement.service');
const { recordAuditLog } = require('../../middleware/auditLog.middleware');

const listVendors = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listVendors(req.query);
  res.status(200).json(new ApiResponse(200, items, 'Vendors retrieved', meta));
});
const getVendorById = asyncHandler(async (req, res) => {
  const v = await service.getVendorById(req.params.id);
  res.status(200).json(new ApiResponse(200, v));
});
const createVendor = asyncHandler(async (req, res) => {
  const v = await service.createVendor(req.body);
  await recordAuditLog({ req, action: 'CREATE', module: 'vendors', entityId: v.id, description: `Added vendor ${v.name}` });
  res.status(201).json(new ApiResponse(201, v, 'Vendor created'));
});
const updateVendor = asyncHandler(async (req, res) => {
  const v = await service.updateVendor(req.params.id, req.body);
  await recordAuditLog({ req, action: 'UPDATE', module: 'vendors', entityId: v.id, description: `Updated vendor ${v.name}` });
  res.status(200).json(new ApiResponse(200, v, 'Vendor updated'));
});
const deleteVendor = asyncHandler(async (req, res) => {
  await service.deleteVendor(req.params.id);
  await recordAuditLog({ req, action: 'DELETE', module: 'vendors', entityId: req.params.id, description: 'Deleted vendor' });
  res.status(200).json(new ApiResponse(200, null, 'Vendor deleted'));
});

const listPurchaseRequests = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listPurchaseRequests(req.query);
  res.status(200).json(new ApiResponse(200, items, 'Purchase requests retrieved', meta));
});
const getPurchaseRequestById = asyncHandler(async (req, res) => {
  const pr = await service.getPurchaseRequestById(req.params.id);
  res.status(200).json(new ApiResponse(200, pr));
});
const createPurchaseRequest = asyncHandler(async (req, res) => {
  const pr = await service.createPurchaseRequest(req.body, req.user.id);
  await recordAuditLog({ req, action: 'CREATE', module: 'procurement', entityId: pr.id, description: `Created purchase request ${pr.requestNumber}` });
  res.status(201).json(new ApiResponse(201, pr, 'Purchase request submitted'));
});
const actionPurchaseRequest = asyncHandler(async (req, res) => {
  const pr = await service.actionPurchaseRequest(req.params.id, req.body, req.user.id);
  await recordAuditLog({ req, action: req.body.status === 'approved' ? 'APPROVE' : 'REJECT', module: 'procurement', entityId: pr.id, description: `Purchase request ${pr.requestNumber} ${req.body.status}` });
  res.status(200).json(new ApiResponse(200, pr, `Purchase request ${req.body.status}`));
});

const listPurchaseOrders = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listPurchaseOrders(req.query);
  res.status(200).json(new ApiResponse(200, items, 'Purchase orders retrieved', meta));
});
const getPurchaseOrderById = asyncHandler(async (req, res) => {
  const po = await service.getPurchaseOrderById(req.params.id);
  res.status(200).json(new ApiResponse(200, po));
});
const createPurchaseOrder = asyncHandler(async (req, res) => {
  const po = await service.createPurchaseOrder(req.body, req.user.id);
  await recordAuditLog({ req, action: 'CREATE', module: 'procurement', entityId: po.id, description: `Created purchase order ${po.poNumber} for ${po.totalAmount}`, newValue: po });
  res.status(201).json(new ApiResponse(201, po, 'Purchase order created'));
});
const receiveItems = asyncHandler(async (req, res) => {
  const po = await service.receivePurchaseOrderItems(req.params.id, req.body.receipts, req.user.id);
  await recordAuditLog({ req, action: 'UPDATE', module: 'procurement', entityId: po.id, description: `Received goods against PO ${po.poNumber}` });
  res.status(200).json(new ApiResponse(200, po, 'Goods received and stock updated'));
});

module.exports = {
  listVendors, getVendorById, createVendor, updateVendor, deleteVendor,
  listPurchaseRequests, getPurchaseRequestById, createPurchaseRequest, actionPurchaseRequest,
  listPurchaseOrders, getPurchaseOrderById, createPurchaseOrder, receiveItems,
};
