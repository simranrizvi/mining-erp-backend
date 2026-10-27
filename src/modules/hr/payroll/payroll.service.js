const { prisma } = require('../../../config/db');
const ApiError = require('../../../utils/ApiError');
const { parsePagination, buildMeta } = require('../../../utils/pagination');

const includeStandard = {
  employee: {
    select: {
      id: true, employeeCode: true, firstName: true, lastName: true,
      designation: true, departmentId: true, basicSalary: true,
    },
  },
};

function computeNet({ basicSalary, allowances = 0, deductions = 0, overtimePay = 0 }) {
  return Math.max(basicSalary + allowances + overtimePay - deductions, 0);
}

async function listPayrolls(query) {
  const { page, limit, skip, take, orderBy } = parsePagination({
    ...query,
    sortBy: query.sortBy || 'createdAt',
    sortOrder: query.sortOrder || 'desc',
  });

  const employeeFilter = query.search
    ? {
        employee: {
          is: {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { employeeCode: { contains: query.search, mode: 'insensitive' } },
            ],
          },
        },
      }
    : {};

  const where = {
    AND: [
      query.employeeId ? { employeeId: query.employeeId } : {},
      query.month ? { month: parseInt(query.month, 10) } : {},
      query.year ? { year: parseInt(query.year, 10) } : {},
      query.status ? { status: query.status } : {},
      employeeFilter,
    ],
  };

  const [items, total] = await Promise.all([
    prisma.payroll.findMany({ where, skip, take, orderBy, include: includeStandard }),
    prisma.payroll.count({ where }),
  ]);

  return { items, meta: buildMeta(total, page, limit) };
}

async function getPayrollById(id) {
  const payroll = await prisma.payroll.findUnique({ where: { id }, include: includeStandard });
  if (!payroll) throw ApiError.notFound('Payroll record not found.');
  return payroll;
}

async function getSummary(query = {}) {
  const where = {
    AND: [
      query.month ? { month: parseInt(query.month, 10) } : {},
      query.year ? { year: parseInt(query.year, 10) } : {},
    ],
  };

  const [totalRecords, statusAgg, netAgg] = await Promise.all([
    prisma.payroll.count({ where }),
    prisma.payroll.groupBy({ by: ['status'], where, _count: { _all: true } }),
    prisma.payroll.aggregate({ where, _sum: { netSalary: true, basicSalary: true } }),
  ]);

  const byStatus = { draft: 0, processed: 0, paid: 0 };
  statusAgg.forEach((row) => { byStatus[row.status] = row._count._all; });

  return {
    totalRecords,
    byStatus,
    totalNetPayable: netAgg._sum.netSalary || 0,
    totalBasicSalaries: netAgg._sum.basicSalary || 0,
  };
}

async function createPayroll(data) {
  const existing = await prisma.payroll.findUnique({
    where: { employeeId_month_year: { employeeId: data.employeeId, month: data.month, year: data.year } },
  });
  if (existing) {
    throw ApiError.conflict(`A payroll for this employee already exists for ${data.month}/${data.year}.`);
  }

  const employee = await prisma.employee.findUnique({ where: { id: data.employeeId } });
  if (!employee) throw ApiError.notFound('Employee not found.');

  return prisma.payroll.create({
    data: { ...data, netSalary: computeNet(data), status: 'draft' },
    include: includeStandard,
  });
}

async function generateDrafts({ month, year }) {
  const employees = await prisma.employee.findMany({ where: { status: { in: ['active', 'on_leave'] } } });
  let created = 0;
  let skipped = 0;

  for (const emp of employees) {
    const exists = await prisma.payroll.findUnique({
      where: { employeeId_month_year: { employeeId: emp.id, month, year } },
    });
    if (exists) {
      skipped += 1;
      continue;
    }
    await prisma.payroll.create({
      data: {
        employeeId: emp.id,
        month,
        year,
        basicSalary: emp.basicSalary,
        allowances: 0,
        deductions: 0,
        overtimePay: 0,
        netSalary: computeNet({ basicSalary: emp.basicSalary }),
        status: 'draft',
      },
    });
    created += 1;
  }

  return { created, skipped, total: employees.length };
}

async function updatePayroll(id, data) {
  const payroll = await getPayrollById(id);
  if (payroll.status !== 'draft') {
    throw ApiError.badRequest('Only draft payroll records can be edited. Processed/paid records are locked.');
  }

  const merged = {
    basicSalary: data.basicSalary ?? payroll.basicSalary,
    allowances: data.allowances ?? payroll.allowances,
    deductions: data.deductions ?? payroll.deductions,
    overtimePay: data.overtimePay ?? payroll.overtimePay,
  };

  return prisma.payroll.update({
    where: { id },
    data: { ...data, netSalary: computeNet(merged) },
    include: includeStandard,
  });
}

async function actionPayroll(id, { status }) {
  const payroll = await getPayrollById(id);

  if (status === 'processed') {
    if (payroll.status !== 'draft') {
      throw ApiError.badRequest(`Cannot process a payroll that is already '${payroll.status}'.`);
    }
    return prisma.payroll.update({ where: { id }, data: { status: 'processed', processedAt: new Date() }, include: includeStandard });
  }

  if (status === 'paid') {
    if (payroll.status !== 'processed') {
      throw ApiError.badRequest(`Cannot mark a '${payroll.status}' payroll as paid. Process it first.`);
    }
    return prisma.payroll.update({ where: { id }, data: { status: 'paid', paidAt: new Date() }, include: includeStandard });
  }

  throw ApiError.badRequest(`Unsupported payroll action: ${status}`);
}

async function deletePayroll(id) {
  const payroll = await getPayrollById(id);
  if (payroll.status !== 'draft') {
    throw ApiError.badRequest('Only draft payroll records can be deleted.');
  }
  await prisma.payroll.delete({ where: { id } });
}

module.exports = {
  listPayrolls, getPayrollById, getSummary, createPayroll, generateDrafts,
  updatePayroll, actionPayroll, deletePayroll,
};
