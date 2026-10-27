const { prisma } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { parsePagination, buildMeta } = require('../../utils/pagination');

async function listMineSites(query) {
  const { page, limit, skip, take, orderBy } = parsePagination(query);
  const where = {
    AND: [
      query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { code: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {},
      query.status ? { status: query.status } : {},
    ],
  };

  const [items, total] = await Promise.all([
    prisma.mineSite.findMany({
      where, skip, take, orderBy,
      include: { _count: { select: { employees: true, equipment: true, vehicles: true } } },
    }),
    prisma.mineSite.count({ where }),
  ]);

  return { items, meta: buildMeta(total, page, limit) };
}

async function getMineSiteById(id) {
  const site = await prisma.mineSite.findUnique({
    where: { id },
    include: { _count: { select: { employees: true, equipment: true, vehicles: true, productions: true } } },
  });
  if (!site) throw ApiError.notFound('Mine site not found.');
  return site;
}

async function createMineSite(data) {
  const existing = await prisma.mineSite.findUnique({ where: { code: data.code } });
  if (existing) throw ApiError.conflict('A mine site with this code already exists.');
  return prisma.mineSite.create({ data });
}

async function updateMineSite(id, data) {
  await getMineSiteById(id);
  return prisma.mineSite.update({ where: { id }, data });
}

async function deleteMineSite(id) {
  await getMineSiteById(id);
  await prisma.mineSite.delete({ where: { id } });
}

module.exports = { listMineSites, getMineSiteById, createMineSite, updateMineSite, deleteMineSite };
