const { prisma } = require('../../config/db');
const ApiError = require('../../utils/ApiError');

const roleInclude = {
  permissions: { include: { permission: true } },
  _count: { select: { users: true } },
};

function formatRole(role) {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    isActive: role.isActive,
    userCount: role._count?.users ?? 0,
    permissions: role.permissions.map((rp) => ({
      id: rp.permission.id,
      key: rp.permission.key,
      module: rp.permission.module,
      action: rp.permission.action,
    })),
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}

async function listRoles() {
  const roles = await prisma.role.findMany({ include: roleInclude, orderBy: { name: 'asc' } });
  return roles.map(formatRole);
}

async function getRoleById(id) {
  const role = await prisma.role.findUnique({ where: { id }, include: roleInclude });
  if (!role) throw ApiError.notFound('Role not found.');
  return formatRole(role);
}

async function createRole({ name, description, permissionIds }) {
  const existing = await prisma.role.findUnique({ where: { name } });
  if (existing) throw ApiError.conflict('A role with this name already exists.');

  const role = await prisma.role.create({
    data: {
      name,
      description,
      permissions: { create: permissionIds.map((permissionId) => ({ permissionId })) },
    },
    include: roleInclude,
  });
  return formatRole(role);
}

async function updateRole(id, data) {
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw ApiError.notFound('Role not found.');
  if (role.isSystem && (data.name || data.isActive === false)) {
    throw ApiError.forbidden('System default roles cannot be renamed or deactivated.');
  }

  const updated = await prisma.role.update({ where: { id }, data, include: roleInclude });
  return formatRole(updated);
}

async function deleteRole(id) {
  const role = await prisma.role.findUnique({ where: { id }, include: { _count: { select: { users: true } } } });
  if (!role) throw ApiError.notFound('Role not found.');
  if (role.isSystem) throw ApiError.forbidden('System default roles cannot be deleted.');
  if (role._count.users > 0) {
    throw ApiError.badRequest('Cannot delete a role that is still assigned to users. Reassign those users first.');
  }
  await prisma.role.delete({ where: { id } });
}

/** Fully replaces a role's permission set — this is how the Super Admin
 * dynamically reshapes what a custom role can do, at runtime. */
async function setPermissions(id, permissionIds) {
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw ApiError.notFound('Role not found.');

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId: id } }),
    prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
      skipDuplicates: true,
    }),
  ]);

  return getRoleById(id);
}

async function listPermissions() {
  const permissions = await prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { action: 'asc' }] });
  // Group by module for a friendlier permission-matrix UI
  const grouped = permissions.reduce((acc, perm) => {
    acc[perm.module] = acc[perm.module] || [];
    acc[perm.module].push(perm);
    return acc;
  }, {});
  return grouped;
}

module.exports = { listRoles, getRoleById, createRole, updateRole, deleteRole, setPermissions, listPermissions };
