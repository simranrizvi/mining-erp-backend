const { prisma } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { parsePagination, buildMeta } = require('../../utils/pagination');

// ---- Warehouses ----
async function listWarehouses(query) {
  const where = query.mineSiteId ? { mineSiteId: query.mineSiteId } : {};
  return prisma.warehouse.findMany({ where, include: { mineSite: { select: { id: true, name: true } }, _count: { select: { items: true } } }, orderBy: { name: 'asc' } });
}
async function createWarehouse(data) {
  return prisma.warehouse.create({ data });
}
async function updateWarehouse(id, data) {
  const w = await prisma.warehouse.findUnique({ where: { id } });
  if (!w) throw ApiError.notFound('Warehouse not found.');
  return prisma.warehouse.update({ where: { id }, data });
}
async function deleteWarehouse(id) {
  const w = await prisma.warehouse.findUnique({ where: { id } });
  if (!w) throw ApiError.notFound('Warehouse not found.');
  await prisma.warehouse.delete({ where: { id } });
}

// ---- Categories ----
async function listCategories() {
  return prisma.inventoryCategory.findMany({ orderBy: { name: 'asc' } });
}
async function createCategory(data) {
  const existing = await prisma.inventoryCategory.findUnique({ where: { name: data.name } });
  if (existing) throw ApiError.conflict('A category with this name already exists.');
  return prisma.inventoryCategory.create({ data });
}

// ---- Items ----
const itemInclude = {
  category: { select: { id: true, name: true } },
  warehouse: { select: { id: true, name: true } },
};

async function listItems(query) {
  const { page, limit, skip, take, orderBy } = parsePagination(query);
  const where = {
    AND: [
      query.search ? { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { sku: { contains: query.search, mode: 'insensitive' } }] } : {},
      query.categoryId ? { categoryId: query.categoryId } : {},
      query.warehouseId ? { warehouseId: query.warehouseId } : {},
    ],
  };
  const [items, total] = await Promise.all([
    prisma.inventoryItem.findMany({ where, skip, take, orderBy, include: itemInclude }),
    prisma.inventoryItem.count({ where }),
  ]);

  // Post-filter low stock (Prisma can't compare two columns directly without raw SQL)
  const filtered = query.lowStock === 'true' ? items.filter((i) => i.quantityInStock <= i.reorderLevel) : items;

  const valuationAgg = await prisma.inventoryItem.aggregate({ where, _sum: { quantityInStock: true } });
  return { items: filtered, meta: { ...buildMeta(total, page, limit), totalStockUnits: valuationAgg._sum.quantityInStock || 0 } };
}

async function getItemById(id) {
  const item = await prisma.inventoryItem.findUnique({ where: { id }, include: itemInclude });
  if (!item) throw ApiError.notFound('Inventory item not found.');
  return item;
}

async function createItem(data) {
  const existing = await prisma.inventoryItem.findUnique({ where: { sku: data.sku } });
  if (existing) throw ApiError.conflict('An item with this SKU already exists.');
  return prisma.inventoryItem.create({ data, include: itemInclude });
}

async function updateItem(id, data) {
  await getItemById(id);
  return prisma.inventoryItem.update({ where: { id }, data, include: itemInclude });
}

async function deleteItem(id) {
  await getItemById(id);
  await prisma.inventoryItem.delete({ where: { id } });
}

/** Records a stock movement and atomically adjusts the item's on-hand quantity. */
async function recordStockMovement(data, performedById) {
  const item = await getItemById(data.itemId);

  let delta = data.quantity;
  if (data.type === 'out') delta = -data.quantity;
  if (data.type === 'adjustment') delta = data.quantity; // signed adjustment passed as positive/negative by caller convention

  const newQuantity = item.quantityInStock + delta;
  if (newQuantity < 0) throw ApiError.badRequest(`Insufficient stock. Available: ${item.quantityInStock} ${item.unit}.`);

  const [movement] = await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        itemId: data.itemId,
        warehouseId: data.warehouseId || item.warehouseId,
        type: data.type,
        quantity: data.quantity,
        reference: data.reference,
        remarks: data.remarks,
        performedById,
      },
    }),
    prisma.inventoryItem.update({ where: { id: data.itemId }, data: { quantityInStock: newQuantity } }),
  ]);

  return { movement, newQuantity };
}

async function listStockMovements(query) {
  const { page, limit, skip, take, orderBy } = parsePagination({ ...query, sortBy: query.sortBy || 'date' });
  const where = query.itemId ? { itemId: query.itemId } : {};
  const [items, total] = await Promise.all([
    prisma.stockMovement.findMany({ where, skip, take, orderBy, include: { item: { select: { id: true, name: true, sku: true, unit: true } } } }),
    prisma.stockMovement.count({ where }),
  ]);
  return { items, meta: buildMeta(total, page, limit) };
}

module.exports = {
  listWarehouses, createWarehouse, updateWarehouse, deleteWarehouse,
  listCategories, createCategory,
  listItems, getItemById, createItem, updateItem, deleteItem,
  recordStockMovement, listStockMovements,
};
