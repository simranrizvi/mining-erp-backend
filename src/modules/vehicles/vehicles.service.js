const { prisma } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { parsePagination, buildMeta } = require('../../utils/pagination');

const includeStandard = {
  mineSite: { select: { id: true, name: true, code: true } },
  assignedDriver: { select: { id: true, firstName: true, lastName: true } },
};

async function listVehicles(query) {
  const { page, limit, skip, take, orderBy } = parsePagination(query);
  const where = {
    AND: [
      query.search ? { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { plateNumber: { contains: query.search, mode: 'insensitive' } }] } : {},
      query.mineSiteId ? { mineSiteId: query.mineSiteId } : {},
      query.status ? { status: query.status } : {},
    ],
  };
  const [items, total] = await Promise.all([
    prisma.vehicle.findMany({ where, skip, take, orderBy, include: includeStandard }),
    prisma.vehicle.count({ where }),
  ]);
  return { items, meta: buildMeta(total, page, limit) };
}

async function getVehicleById(id) {
  const v = await prisma.vehicle.findUnique({ where: { id }, include: includeStandard });
  if (!v) throw ApiError.notFound('Vehicle not found.');
  return v;
}

async function createVehicle(data) {
  const existing = await prisma.vehicle.findUnique({ where: { plateNumber: data.plateNumber } });
  if (existing) throw ApiError.conflict('A vehicle with this plate number already exists.');
  return prisma.vehicle.create({ data, include: includeStandard });
}

async function updateVehicle(id, data) {
  await getVehicleById(id);
  return prisma.vehicle.update({ where: { id }, data, include: includeStandard });
}

async function changeStatus(id, status) {
  await getVehicleById(id);
  return prisma.vehicle.update({ where: { id }, data: { status }, include: includeStandard });
}

async function deleteVehicle(id) {
  await getVehicleById(id);
  await prisma.vehicle.delete({ where: { id } });
}

module.exports = { listVehicles, getVehicleById, createVehicle, updateVehicle, changeStatus, deleteVehicle };
