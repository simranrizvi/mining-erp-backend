const { prisma } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { parsePagination, buildMeta } = require('../../utils/pagination');

const includeStandard = {
  mineSite: { select: { id: true, name: true, code: true } },
  assignedOperator: { select: { id: true, firstName: true, lastName: true } },
};

async function listEquipment(query) {
  const { page, limit, skip, take, orderBy } = parsePagination(query);
  const where = {
    AND: [
      query.search
        ? { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { code: { contains: query.search, mode: 'insensitive' } }] }
        : {},
      query.mineSiteId ? { mineSiteId: query.mineSiteId } : {},
      query.status ? { status: query.status } : {},
      query.type ? { type: query.type } : {},
    ],
  };

  const [items, total] = await Promise.all([
    prisma.equipment.findMany({ where, skip, take, orderBy, include: includeStandard }),
    prisma.equipment.count({ where }),
  ]);
  return { items, meta: buildMeta(total, page, limit) };
}

async function getEquipmentById(id) {
  const eq = await prisma.equipment.findUnique({ where: { id }, include: includeStandard });
  if (!eq) throw ApiError.notFound('Equipment not found.');
  return eq;
}

async function createEquipment(data) {
  const existing = await prisma.equipment.findUnique({ where: { code: data.code } });
  if (existing) throw ApiError.conflict('Equipment with this code already exists.');
  return prisma.equipment.create({ data, include: includeStandard });
}

async function updateEquipment(id, data) {
  await getEquipmentById(id);
  return prisma.equipment.update({ where: { id }, data, include: includeStandard });
}

async function changeStatus(id, status) {
  await getEquipmentById(id);
  return prisma.equipment.update({ where: { id }, data: { status }, include: includeStandard });
}

async function deleteEquipment(id) {
  await getEquipmentById(id);
  await prisma.equipment.delete({ where: { id } });
}

async function utilizationSummary(query) {
  const where = query.mineSiteId ? { mineSiteId: query.mineSiteId } : {};
  const [operational, underMaintenance, breakdown, retired, total] = await Promise.all([
    prisma.equipment.count({ where: { ...where, status: 'operational' } }),
    prisma.equipment.count({ where: { ...where, status: 'under_maintenance' } }),
    prisma.equipment.count({ where: { ...where, status: 'breakdown' } }),
    prisma.equipment.count({ where: { ...where, status: 'retired' } }),
    prisma.equipment.count({ where }),
  ]);
  return { operational, underMaintenance, breakdown, retired, total };
}

module.exports = { listEquipment, getEquipmentById, createEquipment, updateEquipment, changeStatus, deleteEquipment, utilizationSummary };
