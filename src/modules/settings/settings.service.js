const { prisma } = require('../../config/db');
const ApiError = require('../../utils/ApiError');

// ---- Company profile (singleton row) ----
async function getCompany() {
  let company = await prisma.company.findFirst();
  if (!company) {
    company = await prisma.company.create({ data: { name: 'My Mining Company' } });
  }
  return company;
}
async function updateCompany(data) {
  const company = await getCompany();
  return prisma.company.update({ where: { id: company.id }, data });
}

// ---- Generic key/value system settings ----
async function listSettings(category) {
  const where = category ? { category } : {};
  return prisma.systemSetting.findMany({ where, orderBy: { key: 'asc' } });
}
async function upsertSetting({ key, value, category, description }) {
  return prisma.systemSetting.upsert({
    where: { key },
    update: { value, category, description },
    create: { key, value, category, description },
  });
}
async function deleteSetting(key) {
  const existing = await prisma.systemSetting.findUnique({ where: { key } });
  if (!existing) throw ApiError.notFound('Setting not found.');
  await prisma.systemSetting.delete({ where: { key } });
}

// ---- Departments (HR master data) ----
async function listDepartments() {
  return prisma.department.findMany({ orderBy: { name: 'asc' } });
}
async function createDepartment({ name }) {
  const code = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'DEPT';
  const existing = await prisma.department.findUnique({ where: { name } });
  if (existing) throw ApiError.conflict('A department with this name already exists.');
  return prisma.department.create({ data: { name, code } });
}
async function deleteDepartment(id) {
  const dept = await prisma.department.findUnique({ where: { id } });
  if (!dept) throw ApiError.notFound('Department not found.');
  await prisma.department.delete({ where: { id } });
}

// ---- Leave types ----
async function listLeaveTypes() {
  return prisma.leaveType.findMany({ orderBy: { name: 'asc' } });
}
async function createLeaveType(data) {
  const existing = await prisma.leaveType.findUnique({ where: { name: data.name } });
  if (existing) throw ApiError.conflict('A leave type with this name already exists.');
  return prisma.leaveType.create({ data });
}
async function deleteLeaveType(id) {
  const lt = await prisma.leaveType.findUnique({ where: { id } });
  if (!lt) throw ApiError.notFound('Leave type not found.');
  await prisma.leaveType.delete({ where: { id } });
}

// ---- Shifts ----
async function listShifts(query) {
  const where = query.mineSiteId ? { mineSiteId: query.mineSiteId } : {};
  return prisma.shift.findMany({ where, include: { mineSite: { select: { id: true, name: true } } }, orderBy: { name: 'asc' } });
}
async function createShift(data) {
  return prisma.shift.create({ data });
}
async function deleteShift(id) {
  const shift = await prisma.shift.findUnique({ where: { id } });
  if (!shift) throw ApiError.notFound('Shift not found.');
  await prisma.shift.delete({ where: { id } });
}

module.exports = {
  getCompany, updateCompany,
  listSettings, upsertSetting, deleteSetting,
  listDepartments, createDepartment, deleteDepartment,
  listLeaveTypes, createLeaveType, deleteLeaveType,
  listShifts, createShift, deleteShift,
};
