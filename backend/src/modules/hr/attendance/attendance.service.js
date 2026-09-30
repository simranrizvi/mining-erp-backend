const { prisma } = require('../../../config/db');
const ApiError = require('../../../utils/ApiError');
const { parsePagination, buildMeta } = require('../../../utils/pagination');

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function listAttendance(query) {
  const { page, limit, skip, take, orderBy } = parsePagination({ ...query, sortBy: query.sortBy || 'date' });
  const where = {
    AND: [
      query.employeeId ? { employeeId: query.employeeId } : {},
      query.mineSiteId ? { mineSiteId: query.mineSiteId } : {},
      query.status ? { status: query.status } : {},
      query.date ? { date: startOfDay(query.date) } : {},
      query.from || query.to
        ? {
            date: {
              ...(query.from ? { gte: startOfDay(query.from) } : {}),
              ...(query.to ? { lte: startOfDay(query.to) } : {}),
            },
          }
        : {},
    ],
  };

  const [items, total] = await Promise.all([
    prisma.attendance.findMany({
      where, skip, take, orderBy,
      include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
    }),
    prisma.attendance.count({ where }),
  ]);

  return { items, meta: buildMeta(total, page, limit) };
}

async function checkIn(data) {
  const date = startOfDay(data.date);
  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: data.employeeId, date } },
  });
  if (existing) throw ApiError.conflict('Attendance for this employee and date is already recorded.');

  return prisma.attendance.create({
    data: { ...data, date },
    include: { employee: { select: { id: true, firstName: true, lastName: true } } },
  });
}

async function checkOut(id, checkOutTime) {
  const record = await prisma.attendance.findUnique({ where: { id } });
  if (!record) throw ApiError.notFound('Attendance record not found.');
  if (!record.checkIn) throw ApiError.badRequest('Employee has not checked in yet.');

  const hoursWorked = (new Date(checkOutTime) - new Date(record.checkIn)) / (1000 * 60 * 60);

  return prisma.attendance.update({
    where: { id },
    data: { checkOut: checkOutTime, hoursWorked: Math.max(hoursWorked, 0) },
  });
}

/** Marks attendance for many employees at once (e.g. Mine Manager's daily roll call). */
async function bulkMark({ date, mineSiteId, entries }) {
  const day = startOfDay(date);
  const results = await prisma.$transaction(
    entries.map((entry) =>
      prisma.attendance.upsert({
        where: { employeeId_date: { employeeId: entry.employeeId, date: day } },
        update: { status: entry.status, remarks: entry.remarks, mineSiteId },
        create: { employeeId: entry.employeeId, date: day, status: entry.status, remarks: entry.remarks, mineSiteId },
      })
    )
  );
  return results;
}

async function getSummary(query) {
  const where = {
    AND: [
      query.mineSiteId ? { mineSiteId: query.mineSiteId } : {},
      query.date ? { date: startOfDay(query.date) } : { date: startOfDay(new Date()) },
    ],
  };
  const [present, absent, late, onLeave, halfDay] = await Promise.all([
    prisma.attendance.count({ where: { ...where, status: 'present' } }),
    prisma.attendance.count({ where: { ...where, status: 'absent' } }),
    prisma.attendance.count({ where: { ...where, status: 'late' } }),
    prisma.attendance.count({ where: { ...where, status: 'on_leave' } }),
    prisma.attendance.count({ where: { ...where, status: 'half_day' } }),
  ]);
  return { present, absent, late, onLeave, halfDay, total: present + absent + late + onLeave + halfDay };
}

module.exports = { listAttendance, checkIn, checkOut, bulkMark, getSummary };
