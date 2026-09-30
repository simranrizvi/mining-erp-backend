const { prisma } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { genCode } = require('../../utils/codeGenerator');
const { parsePagination, buildMeta } = require('../../utils/pagination');

// ---- Vendors ----
async function listVendors(query) {
  const { page, limit, skip, take, orderBy } = parsePagination(query);
  const where = {
    AND: [
      query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {},
      query.status ? { status: query.status } : {},
    ],
  };
  const [items, total] = await Promise.all([
    prisma.vendor.findMany({ where, skip, take, orderBy }),
    prisma.vendor.count({ where }),
  ]);
  return { items, meta: buildMeta(total, page, limit) };
}
async function getVendorById(id) {
  const vendor = await prisma.vendor.findUnique({ where: { id } });
  if (!vendor) throw ApiError.notFound('Vendor not found.');
  return vendor;
}
async function createVendor(data) {
  return prisma.vendor.create({ data });
}
async function updateVendor(id, data) {
  await getVendorById(id);
  return prisma.vendor.update({ where: { id }, data });
}
async function deleteVendor(id) {
  await getVendorById(id);
  await prisma.vendor.delete({ where: { id } });
}

// ---- Purchase Requests ----
const prInclude = { items: { include: { item: { select: { id: true, name: true, sku: true } } } }, mineSite: { select: { id: true, name: true } } };

async function listPurchaseRequests(query) {
  const { page, limit, skip, take, orderBy } = parsePagination({ ...query, sortBy: query.sortBy || 'createdAt' });
  const where = { AND: [query.status ? { status: query.status } : {}, query.mineSiteId ? { mineSiteId: query.mineSiteId } : {}] };
  const [items, total] = await Promise.all([
    prisma.purchaseRequest.findMany({ where, skip, take, orderBy, include: prInclude }),
    prisma.purchaseRequest.count({ where }),
  ]);
  return { items, meta: buildMeta(total, page, limit) };
}
async function getPurchaseRequestById(id) {
  const pr = await prisma.purchaseRequest.findUnique({ where: { id }, include: prInclude });
  if (!pr) throw ApiError.notFound('Purchase request not found.');
  return pr;
}
async function createPurchaseRequest(data, requestedById) {
  const { items, ...rest } = data;
  return prisma.purchaseRequest.create({
    data: { ...rest, requestNumber: genCode('PR'), requestedById, items: { create: items } },
    include: prInclude,
  });
}
async function actionPurchaseRequest(id, { status, actionRemarks }, actionById) {
  const pr = await getPurchaseRequestById(id);
  if (pr.status !== 'pending') throw ApiError.badRequest('This purchase request has already been actioned.');
  return prisma.purchaseRequest.update({
    where: { id }, data: { status, actionRemarks, actionById, actionAt: new Date() }, include: prInclude,
  });
}

// ---- Purchase Orders ----
const poInclude = {
  vendor: { select: { id: true, name: true } },
  items: { include: { item: { select: { id: true, name: true, sku: true, unit: true } } } },
};

async function listPurchaseOrders(query) {
  const { page, limit, skip, take, orderBy } = parsePagination({ ...query, sortBy: query.sortBy || 'orderDate' });
  const where = { AND: [query.status ? { status: query.status } : {}, query.vendorId ? { vendorId: query.vendorId } : {}] };
  const [items, total] = await Promise.all([
    prisma.purchaseOrder.findMany({ where, skip, take, orderBy, include: poInclude }),
    prisma.purchaseOrder.count({ where }),
  ]);
  return { items, meta: buildMeta(total, page, limit) };
}
async function getPurchaseOrderById(id) {
  const po = await prisma.purchaseOrder.findUnique({ where: { id }, include: poInclude });
  if (!po) throw ApiError.notFound('Purchase order not found.');
  return po;
}
async function createPurchaseOrder(data, createdById) {
  const { items, purchaseRequestId, ...rest } = data;
  const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  return prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.create({
      data: {
        ...rest,
        purchaseRequestId: purchaseRequestId || null,
        poNumber: genCode('PO'),
        totalAmount,
        createdById,
        status: 'sent',
        items: { create: items },
      },
      include: poInclude,
    });

    if (purchaseRequestId) {
      await tx.purchaseRequest.update({ where: { id: purchaseRequestId }, data: { status: 'converted' } });
    }

    return po;
  });
}

/** Receives goods against a PO: bumps receivedQuantity, adds stock, updates PO status. */
async function receivePurchaseOrderItems(id, receipts, performedById) {
  const po = await getPurchaseOrderById(id);
  if (po.status === 'cancelled') throw ApiError.badRequest('Cannot receive items on a cancelled order.');

  await prisma.$transaction(async (tx) => {
    for (const receipt of receipts) {
      const poItem = po.items.find((i) => i.id === receipt.purchaseOrderItemId);
      if (!poItem) throw ApiError.badRequest('Purchase order item not found on this order.');

      const newReceived = poItem.receivedQuantity + receipt.receivedQuantity;
      if (newReceived > poItem.quantity) {
        throw ApiError.badRequest(`Cannot receive more than ordered for "${poItem.description}".`);
      }

      await tx.purchaseOrderItem.update({ where: { id: poItem.id }, data: { receivedQuantity: newReceived } });

      if (poItem.itemId) {
        await tx.inventoryItem.update({ where: { id: poItem.itemId }, data: { quantityInStock: { increment: receipt.receivedQuantity } } });
        await tx.stockMovement.create({
          data: {
            itemId: poItem.itemId, type: 'in', quantity: receipt.receivedQuantity,
            reference: po.poNumber, performedById, remarks: `Received against PO ${po.poNumber}`,
          },
        });
      }
    }

    const refreshedItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: id } });
    const fullyReceived = refreshedItems.every((i) => i.receivedQuantity >= i.quantity);
    const partiallyReceived = refreshedItems.some((i) => i.receivedQuantity > 0);
    await tx.purchaseOrder.update({
      where: { id },
      data: { status: fullyReceived ? 'received' : partiallyReceived ? 'partial' : po.status },
    });
  });

  return getPurchaseOrderById(id);
}

module.exports = {
  listVendors, getVendorById, createVendor, updateVendor, deleteVendor,
  listPurchaseRequests, getPurchaseRequestById, createPurchaseRequest, actionPurchaseRequest,
  listPurchaseOrders, getPurchaseOrderById, createPurchaseOrder, receivePurchaseOrderItems,
};
