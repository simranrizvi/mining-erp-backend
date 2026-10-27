const { prisma } = require('../../../config/db');
const ApiError = require('../../../utils/ApiError');
const { parsePagination, buildMeta } = require('../../../utils/pagination');

const includeStandard = {
  employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
  leaveType: { select: { id: true, name: true, maxDaysPerYear: true } },
};

async function listLeaveRequests(query) {
  const { page, limit, skip, take, orderBy } = parsePagination({ ...query, sortBy: query.sortBy || 'appliedAt' });
  const where = {
    AND: [
      query.employeeId ? { employeeId: query.employeeId } : {},
      query.status ? { status: query.status } : {},
    ],
  };

  const [items, total] = await Promise.all([
    prisma.leaveRequest.findMany({ where, skip, take, orderBy, include: includeStandard }),
    prisma.leaveRequest.count({ where }),
  ]);

  return { items, meta: buildMeta(total, page, limit) };
}

async function getLeaveById(id) {
  const leave = await prisma.leaveRequest.findUnique({ where: { id }, include: includeStandard });
  if (!leave) throw ApiError.notFound('Leave request not found.');
  return leave;
}

async function applyLeave(data) {
  const overlapping = await prisma.leaveRequest.findFirst({
    where: {
      employeeId: data.employeeId,
      status: { in: ['pending', 'approved'] },
      OR: [{ startDate: { lte: data.endDate }, endDate: { gte: data.startDate } }],
    },
  });
  if (overlapping) throw ApiError.conflict('This employee already has a leave request overlapping these dates.');

  return prisma.leaveRequest.create({ data, include: includeStandard });
}

async function actionLeave(id, { status, actionRemarks }, approvedById) {
  const leave = await getLeaveById(id);
  if (leave.status !== 'pending') throw ApiError.badRequest('This leave request has already been actioned.');

  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: { status, actionRemarks, approvedById, actionAt: new Date() },
    include: includeStandard,
  });

  if (status === 'approved') {
    await prisma.employee.update({ where: { id: leave.employeeId }, data: { status: 'active' } });
  }

  return updated;
}

async function cancelLeave(id) {
  const leave = await getLeaveById(id);
  if (leave.status !== 'pending') throw ApiError.badRequest('Only pending leave requests can be cancelled.');
  return prisma.leaveRequest.update({ where: { id }, data: { status: 'cancelled' } });
}

module.exports = { listLeaveRequests, getLeaveById, applyLeave, actionLeave, cancelLeave };
