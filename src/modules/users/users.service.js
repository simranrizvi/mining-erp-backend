const bcrypt = require('bcryptjs');
const { prisma } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const env = require('../../config/env');
const { parsePagination, buildMeta } = require('../../utils/pagination');

const selectSafe = {
  id: true,
  name: true,
  email: true,
  phone: true,
  avatarUrl: true,
  isActive: true,
  mustChangePassword: true,
  lastLoginAt: true,
  roleId: true,
  role: { select: { id: true, name: true } },
  mineSiteId: true,
  mineSite: { select: { id: true, name: true, code: true } },
  createdAt: true,
  updatedAt: true,
};

async function listUsers(query) {
  const { page, limit, skip, take, orderBy } = parsePagination(query);
  const where = {
    AND: [
      query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {},
      query.roleId ? { roleId: query.roleId } : {},
      query.mineSiteId ? { mineSiteId: query.mineSiteId } : {},
      query.isActive !== undefined ? { isActive: query.isActive === 'true' } : {},
    ],
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({ where, select: selectSafe, skip, take, orderBy }),
    prisma.user.count({ where }),
  ]);

  return { items, meta: buildMeta(total, page, limit) };
}

async function getUserById(id) {
  const user = await prisma.user.findUnique({ where: { id }, select: selectSafe });
  if (!user) throw ApiError.notFound('User not found.');
  return user;
}

async function createUser(data, createdById) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw ApiError.conflict('A user with this email already exists.');

  const hashed = await bcrypt.hash(data.password, env.BCRYPT_SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashed,
      phone: data.phone,
      roleId: data.roleId,
      mineSiteId: data.mineSiteId || null,
      isActive: data.isActive ?? true,
      mustChangePassword: true,
      createdById,
    },
    select: selectSafe,
  });

  return user;
}

async function updateUser(id, data) {
  await getUserById(id);
  const user = await prisma.user.update({ where: { id }, data, select: selectSafe });
  return user;
}

async function deleteUser(id, requestingUserId) {
  if (id === requestingUserId) throw ApiError.badRequest('You cannot delete your own account.');
  await getUserById(id);
  await prisma.user.delete({ where: { id } });
}

async function resetPassword(id, newPassword) {
  await getUserById(id);
  const hashed = await bcrypt.hash(newPassword, env.BCRYPT_SALT_ROUNDS);
  await prisma.user.update({
    where: { id },
    data: { password: hashed, mustChangePassword: true },
  });
  await prisma.refreshToken.updateMany({ where: { userId: id }, data: { revoked: true } });
}

module.exports = { listUsers, getUserById, createUser, updateUser, deleteUser, resetPassword };
