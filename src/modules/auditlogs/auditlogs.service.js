const { prisma } = require('../../config/db');
const { parsePagination, buildMeta } = require('../../utils/pagination');

async function listAuditLogs(query) {
  const { page, limit, skip, take, orderBy } = parsePagination({ ...query, sortBy: query.sortBy || 'createdAt' });

  const where = {
    AND: [
      query.module ? { module: query.module } : {},
      query.action ? { action: query.action } : {},
      query.userId ? { userId: query.userId } : {},
      query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {},
    ],
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take,
      orderBy,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, meta: buildMeta(total, page, limit) };
}

module.exports = { listAuditLogs };
