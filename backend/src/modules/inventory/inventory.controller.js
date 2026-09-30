const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./inventory.service');
const { recordAuditLog } = require('../../middleware/auditLog.middleware');

const listWarehouses = asyncHandler(async (req, res) => {
  const data = await service.listWarehouses(req.query);
  res.status(200).json(new ApiResponse(200, data));
});
const createWarehouse = asyncHandler(async (req, res) => {
  const w = await service.createWarehouse(req.body);
  await recordAuditLog({ req, action: 'CREATE', module: 'inventory', entityId: w.id, description: `Created warehouse ${w.name}` });
  res.status(201).json(new ApiResponse(201, w, 'Warehouse created'));
});
const updateWarehouse = asyncHandler(async (req, res) => {
  const w = await service.updateWarehouse(req.params.id, req.body);
  await recordAuditLog({ req, action: 'UPDATE', module: 'inventory', entityId: w.id, description: `Updated warehouse ${w.name}` });
  res.status(200).json(new ApiResponse(200, w, 'Warehouse updated'));
});
const deleteWarehouse = asyncHandler(async (req, res) => {
  await service.deleteWarehouse(req.params.id);
  await recordAuditLog({ req, action: 'DELETE', module: 'inventory', entityId: req.params.id, description: 'Deleted warehouse' });
  res.status(200).json(new ApiResponse(200, null, 'Warehouse deleted'));
});

const listCategories = asyncHandler(async (req, res) => {
  const data = await service.listCategories();
  res.status(200).json(new ApiResponse(200, data));
});
const createCategory = asyncHandler(async (req, res) => {
  const c = await service.createCategory(req.body);
  res.status(201).json(new ApiResponse(201, c, 'Category created'));
});

const listItems = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listItems(req.query);
  res.status(200).json(new ApiResponse(200, items, 'Inventory items retrieved', meta));
});
const getItemById = asyncHandler(async (req, res) => {
  const item = await service.getItemById(req.params.id);
  res.status(200).json(new ApiResponse(200, item));
});
const createItem = asyncHandler(async (req, res) => {
  const item = await service.createItem(req.body);
  await recordAuditLog({ req, action: 'CREATE', module: 'inventory', entityId: item.id, description: `Added inventory item ${item.name}`, newValue: item });
  res.status(201).json(new ApiResponse(201, item, 'Inventory item created'));
});
const updateItem = asyncHandler(async (req, res) => {
  const before = await service.getItemById(req.params.id);
  const item = await service.updateItem(req.params.id, req.body);
  await recordAuditLog({ req, action: 'UPDATE', module: 'inventory', entityId: item.id, description: `Updated item ${item.name}`, oldValue: before, newValue: item });
  res.status(200).json(new ApiResponse(200, item, 'Inventory item updated'));
});
const deleteItem = asyncHandler(async (req, res) => {
  const before = await service.getItemById(req.params.id);
  await service.deleteItem(req.params.id);
  await recordAuditLog({ req, action: 'DELETE', module: 'inventory', entityId: req.params.id, description: `Deleted item ${before.name}`, oldValue: before });
  res.status(200).json(new ApiResponse(200, null, 'Inventory item deleted'));
});

const stockMovement = asyncHandler(async (req, res) => {
  const { movement, newQuantity } = await service.recordStockMovement(req.body, req.user.id);
  await recordAuditLog({
    req, action: 'CREATE', module: 'inventory', entityId: movement.itemId,
    description: `Stock ${req.body.type} of ${req.body.quantity} recorded. New balance: ${newQuantity}`,
  });
  res.status(201).json(new ApiResponse(201, { movement, newQuantity }, 'Stock movement recorded'));
});

const listStockMovements = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listStockMovements(req.query);
  res.status(200).json(new ApiResponse(200, items, 'Stock movements retrieved', meta));
});

module.exports = {
  listWarehouses, createWarehouse, updateWarehouse, deleteWarehouse,
  listCategories, createCategory,
  listItems, getItemById, createItem, updateItem, deleteItem,
  stockMovement, listStockMovements,
};
