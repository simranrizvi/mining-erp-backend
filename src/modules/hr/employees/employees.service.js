const bcrypt = require('bcryptjs');
const { prisma } = require('../../../config/db');
const ApiError = require('../../../utils/ApiError');
const env = require('../../../config/env');
const { genCode } = require('../../../utils/codeGenerator');
const { parsePagination, buildMeta } = require('../../../utils/pagination');

const includeStandard = {
  department: { select: { id: true, name: true } },
  mineSite: { select: { id: true, name: true, code: true } },
  user: { select: { id: true, email: true, isActive: true } },
};

async function listEmployees(query) {
  const { page, limit, skip, take, orderBy } = parsePagination(query);
  const where = {
    AND: [
      query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { employeeCode: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {},
      query.departmentId ? { departmentId: query.departmentId } : {},
      query.mineSiteId ? { mineSiteId: query.mineSiteId } : {},
      query.status ? { status: query.status } : {},
    ],
  };

  const [items, total] = await Promise.all([
    prisma.employee.findMany({ where, skip, take, orderBy, include: includeStandard }),
    prisma.employee.count({ where }),
  ]);

  return { items, meta: buildMeta(total, page, limit) };
}

async function getEmployeeById(id) {
  const employee = await prisma.employee.findUnique({ where: { id }, include: includeStandard });
  if (!employee) throw ApiError.notFound('Employee not found.');
  return employee;
}

async function createEmployee(data) {
  const existing = await prisma.employee.findUnique({ where: { email: data.email } });
  if (existing) throw ApiError.conflict('An employee with this email already exists.');

  const { createLoginAccount, roleId, ...employeeData } = data;
  const employeeCode = genCode('EMP');
  let tempPassword = null;

  const employee = await prisma.$transaction(async (tx) => {
    let userId = null;

    if (createLoginAccount) {
      const existingUser = await tx.user.findUnique({ where: { email: data.email } });
      if (existingUser) throw ApiError.conflict('A user account with this email already exists.');

      tempPassword = `Mine@${Math.floor(1000 + Math.random() * 9000)}`;
      const hashed = await bcrypt.hash(tempPassword, env.BCRYPT_SALT_ROUNDS);

      const user = await tx.user.create({
        data: {
          name: `${data.firstName} ${data.lastName}`,
          email: data.email,
          password: hashed,
          roleId,
          mineSiteId: employeeData.mineSiteId || null,
          mustChangePassword: true,
        },
      });
      userId = user.id;
    }

    return tx.employee.create({
      data: { ...employeeData, employeeCode, userId },
      include: includeStandard,
    });
  });

  // tempPassword is returned once (plaintext) so the admin can hand the
  // credentials to the new employee — it is never stored or retrievable later.
  return tempPassword ? { ...employee, tempPassword } : employee;
}

async function updateEmployee(id, data) {
  await getEmployeeById(id);
  return prisma.employee.update({ where: { id }, data, include: includeStandard });
}

async function deleteEmployee(id) {
  const employee = await getEmployeeById(id);
  await prisma.$transaction(async (tx) => {
    // Remove the employee first (it holds the FK to users), then the linked
    // login account so no orphan user survives with working credentials.
    await tx.employee.delete({ where: { id } });
    if (employee.userId) {
      const user = await tx.user.findUnique({ where: { id: employee.userId }, include: { role: true } });
      if (user && user.role.name !== 'Super Admin') {
        await tx.user.delete({ where: { id: user.id } });
      }
    }
  });
}

async function updatePhoto(id, photoUrl) {
  await getEmployeeById(id);
  return prisma.employee.update({ where: { id }, data: { photoUrl }, include: includeStandard });
}

module.exports = { listEmployees, getEmployeeById, createEmployee, updateEmployee, deleteEmployee, updatePhoto };
