const { prisma } = require('../../../config/db');
const ApiError = require('../../../utils/ApiError');
const { parsePagination, buildMeta } = require('../../../utils/pagination');

const includeStandard = {
  mineSite: { select: { id: true, name: true, code: true } },
  equipment: { select: { id: true, name: true, code: true } },
  operator: { select: { id: true, firstName: true, lastName: true } },
};

async function listProduction(query) {
  const { page, limit, skip, take, orderBy } = parsePagination({ ...query, sortBy: query.sortBy || 'date' });
  const where = {
    AND: [
      query.mineSiteId ? { mineSiteId: query.mineSiteId } : {},
      query.materialType ? { materialType: { contains: query.materialType, mode: 'insensitive' } } : {},
      query.shift ? { shift: query.shift } : {},
      query.from || query.to
        ? {
            date: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {},
    ],
  };

  const [items, total, aggregate] = await Promise.all([
    prisma.production.findMany({ where, skip, take, orderBy, include: includeStandard }),
    prisma.production.count({ where }),
    prisma.production.aggregate({ where, _sum: { quantity: true } }),
  ]);

  return { items, meta: { ...buildMeta(total, page, limit), totalQuantity: aggregate._sum.quantity || 0 } };
}

async function getProductionById(id) {
  const record = await prisma.production.findUnique({ where: { id }, include: includeStandard });
  if (!record) throw ApiError.notFound('Production record not found.');
  return record;
}

async function createProduction(data) {
  return prisma.production.create({ data, include: includeStandard });
}

async function updateProduction(id, data) {
  await getProductionById(id);
  return prisma.production.update({ where: { id }, data, include: includeStandard });
}

async function deleteProduction(id) {
  await getProductionById(id);
  await prisma.production.delete({ where: { id } });
}

/** Aggregated production by material type — powers the Mining Operations dashboard chart. */
async function productionByMaterial(query) {
  const where = {
    AND: [
      query.mineSiteId ? { mineSiteId: query.mineSiteId } : {},
      query.from || query.to
        ? {
            date: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {},
    ],
  };
  const grouped = await prisma.production.groupBy({
    by: ['materialType'],
    where,
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
  });
  return grouped.map((g) => ({ materialType: g.materialType, quantity: g._sum.quantity || 0 }));
}

module.exports = { listProduction, getProductionById, createProduction, updateProduction, deleteProduction, productionByMaterial };
