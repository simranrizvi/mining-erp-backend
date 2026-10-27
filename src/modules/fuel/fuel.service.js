const { prisma } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { parsePagination, buildMeta } = require('../../utils/pagination');

async function listStations(query) {
  const where = query.mineSiteId ? { mineSiteId: query.mineSiteId } : {};
  return prisma.fuelStation.findMany({ where, include: { mineSite: { select: { id: true, name: true } } }, orderBy: { name: 'asc' } });
}
async function getStationById(id) {
  const station = await prisma.fuelStation.findUnique({ where: { id } });
  if (!station) throw ApiError.notFound('Fuel station not found.');
  return station;
}
async function createStation(data) {
  return prisma.fuelStation.create({ data });
}
async function updateStation(id, data) {
  await getStationById(id);
  return prisma.fuelStation.update({ where: { id }, data });
}
async function deleteStation(id) {
  await getStationById(id);
  await prisma.fuelStation.delete({ where: { id } });
}

const txInclude = {
  fuelStation: { select: { id: true, name: true, fuelType: true } },
  vehicle: { select: { id: true, name: true, plateNumber: true } },
  equipment: { select: { id: true, name: true, code: true } },
  issuedBy: { select: { id: true, firstName: true, lastName: true } },
};

async function listTransactions(query) {
  const { page, limit, skip, take, orderBy } = parsePagination({ ...query, sortBy: query.sortBy || 'date' });
  const where = {
    AND: [
      query.fuelStationId ? { fuelStationId: query.fuelStationId } : {},
      query.vehicleId ? { vehicleId: query.vehicleId } : {},
      query.equipmentId ? { equipmentId: query.equipmentId } : {},
    ],
  };
  const [items, total, agg] = await Promise.all([
    prisma.fuelTransaction.findMany({ where, skip, take, orderBy, include: txInclude }),
    prisma.fuelTransaction.count({ where }),
    prisma.fuelTransaction.aggregate({ where, _sum: { quantity: true, cost: true } }),
  ]);
  return { items, meta: { ...buildMeta(total, page, limit), totalQuantity: agg._sum.quantity || 0, totalCost: agg._sum.cost || 0 } };
}

/** Issues fuel: deducts from station stock, records the transaction, and updates the vehicle's odometer if provided. */
async function createTransaction(data, issuedById) {
  const station = await getStationById(data.fuelStationId);
  if (station.currentStock < data.quantity) {
    throw ApiError.badRequest(`Insufficient fuel at station. Available: ${station.currentStock}L.`);
  }

  return prisma.$transaction(async (tx) => {
    const transaction = await tx.fuelTransaction.create({ data: { ...data, issuedById }, include: txInclude });
    await tx.fuelStation.update({ where: { id: data.fuelStationId }, data: { currentStock: { decrement: data.quantity } } });
    if (data.vehicleId && data.odometerReading) {
      await tx.vehicle.update({ where: { id: data.vehicleId }, data: { currentOdometer: data.odometerReading } });
    }
    return transaction;
  });
}

/** Purchases fuel into a station's tank, increasing stock and capacity checks. */
async function createPurchase(data) {
  const station = await getStationById(data.fuelStationId);
  const projected = station.currentStock + data.quantity;
  if (station.capacity && projected > station.capacity) {
    throw ApiError.badRequest(`This purchase would exceed the station's capacity of ${station.capacity}L.`);
  }

  return prisma.$transaction(async (tx) => {
    const purchase = await tx.fuelPurchase.create({ data, include: { fuelStation: { select: { id: true, name: true } }, vendor: { select: { id: true, name: true } } } });
    await tx.fuelStation.update({ where: { id: data.fuelStationId }, data: { currentStock: { increment: data.quantity } } });
    return purchase;
  });
}

async function listPurchases(query) {
  const { page, limit, skip, take, orderBy } = parsePagination({ ...query, sortBy: query.sortBy || 'purchaseDate' });
  const where = query.fuelStationId ? { fuelStationId: query.fuelStationId } : {};
  const [items, total] = await Promise.all([
    prisma.fuelPurchase.findMany({ where, skip, take, orderBy, include: { fuelStation: { select: { id: true, name: true } }, vendor: { select: { id: true, name: true } } } }),
    prisma.fuelPurchase.count({ where }),
  ]);
  return { items, meta: buildMeta(total, page, limit) };
}

module.exports = {
  listStations, getStationById, createStation, updateStation, deleteStation,
  listTransactions, createTransaction, createPurchase, listPurchases,
};
