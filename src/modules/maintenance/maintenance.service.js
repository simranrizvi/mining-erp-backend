const { prisma } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { parsePagination, buildMeta } = require('../../utils/pagination');

const assetSelect = {
  equipment: { select: { id: true, name: true, code: true } },
  vehicle: { select: { id: true, name: true, plateNumber: true } },
};

// ---- Schedules ----

async function listSchedules(query) {
  const { page, limit, skip, take, orderBy } = parsePagination({ ...query, sortBy: query.sortBy || 'scheduledDate' });
  const where = {
    AND: [
      query.equipmentId ? { equipmentId: query.equipmentId } : {},
      query.vehicleId ? { vehicleId: query.vehicleId } : {},
      query.status ? { status: query.status } : {},
    ],
  };
  const [items, total] = await Promise.all([
    prisma.maintenanceSchedule.findMany({ where, skip, take, orderBy, include: assetSelect }),
    prisma.maintenanceSchedule.count({ where }),
  ]);
  return { items, meta: buildMeta(total, page, limit) };
}

async function createSchedule(data) {
  return prisma.maintenanceSchedule.create({ data, include: assetSelect });
}

async function updateSchedule(id, data) {
  const existing = await prisma.maintenanceSchedule.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Maintenance schedule not found.');
  return prisma.maintenanceSchedule.update({ where: { id }, data, include: assetSelect });
}

async function deleteSchedule(id) {
  const existing = await prisma.maintenanceSchedule.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Maintenance schedule not found.');
  await prisma.maintenanceSchedule.delete({ where: { id } });
}

// ---- Records ----

async function listRecords(query) {
  const { page, limit, skip, take, orderBy } = parsePagination({ ...query, sortBy: query.sortBy || 'startDate' });
  const where = {
    AND: [
      query.equipmentId ? { equipmentId: query.equipmentId } : {},
      query.vehicleId ? { vehicleId: query.vehicleId } : {},
      query.status ? { status: query.status } : {},
    ],
  };
  const [items, total, costAgg] = await Promise.all([
    prisma.maintenanceRecord.findMany({ where, skip, take, orderBy, include: { ...assetSelect, vendor: { select: { id: true, name: true } } } }),
    prisma.maintenanceRecord.count({ where }),
    prisma.maintenanceRecord.aggregate({ where, _sum: { cost: true, downtimeHours: true } }),
  ]);
  return {
    items,
    meta: { ...buildMeta(total, page, limit), totalCost: costAgg._sum.cost || 0, totalDowntimeHours: costAgg._sum.downtimeHours || 0 },
  };
}

async function getRecordById(id) {
  const record = await prisma.maintenanceRecord.findUnique({ where: { id }, include: { ...assetSelect, vendor: { select: { id: true, name: true } } } });
  if (!record) throw ApiError.notFound('Maintenance record not found.');
  return record;
}

/** Creating an in-progress record automatically flips the asset to under_maintenance. */
async function createRecord(data) {
  return prisma.$transaction(async (tx) => {
    const record = await tx.maintenanceRecord.create({ data, include: { ...assetSelect, vendor: { select: { id: true, name: true } } } });
    if (data.status === 'in_progress') {
      if (data.equipmentId) await tx.equipment.update({ where: { id: data.equipmentId }, data: { status: 'under_maintenance' } });
      if (data.vehicleId) await tx.vehicle.update({ where: { id: data.vehicleId }, data: { status: 'under_maintenance' } });
    }
    return record;
  });
}

/** Completing a record automatically flips the asset back to operational. */
async function updateRecord(id, data) {
  const before = await getRecordById(id);
  return prisma.$transaction(async (tx) => {
    const record = await tx.maintenanceRecord.update({ where: { id }, data, include: { ...assetSelect, vendor: { select: { id: true, name: true } } } });
    if (data.status === 'completed' && before.status !== 'completed') {
      if (before.equipmentId) await tx.equipment.update({ where: { id: before.equipmentId }, data: { status: 'operational' } });
      if (before.vehicleId) await tx.vehicle.update({ where: { id: before.vehicleId }, data: { status: 'operational' } });
    }
    return record;
  });
}

async function deleteRecord(id) {
  await getRecordById(id);
  await prisma.maintenanceRecord.delete({ where: { id } });
}

module.exports = {
  listSchedules, createSchedule, updateSchedule, deleteSchedule,
  listRecords, getRecordById, createRecord, updateRecord, deleteRecord,
};
