const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./roles.service');
const { recordAuditLog } = require('../../middleware/auditLog.middleware');

const list = asyncHandler(async (req, res) => {
  const roles = await service.listRoles();
  res.status(200).json(new ApiResponse(200, roles));
});

const getById = asyncHandler(async (req, res) => {
  const role = await service.getRoleById(req.params.id);
  res.status(200).json(new ApiResponse(200, role));
});

const create = asyncHandler(async (req, res) => {
  const role = await service.createRole(req.body);
  await recordAuditLog({
    req, action: 'CREATE', module: 'roles', entityId: role.id,
    description: `Created custom role "${role.name}"`, newValue: role,
  });
  res.status(201).json(new ApiResponse(201, role, 'Role created successfully'));
});

const update = asyncHandler(async (req, res) => {
  const before = await service.getRoleById(req.params.id);
  const role = await service.updateRole(req.params.id, req.body);
  await recordAuditLog({
    req, action: 'UPDATE', module: 'roles', entityId: role.id,
    description: `Updated role "${role.name}"`, oldValue: before, newValue: role,
  });
  res.status(200).json(new ApiResponse(200, role, 'Role updated successfully'));
});

const remove = asyncHandler(async (req, res) => {
  const before = await service.getRoleById(req.params.id);
  await service.deleteRole(req.params.id);
  await recordAuditLog({
    req, action: 'DELETE', module: 'roles', entityId: req.params.id,
    description: `Deleted role "${before.name}"`, oldValue: before,
  });
  res.status(200).json(new ApiResponse(200, null, 'Role deleted successfully'));
});

const setPermissions = asyncHandler(async (req, res) => {
  const before = await service.getRoleById(req.params.id);
  const role = await service.setPermissions(req.params.id, req.body.permissionIds);
  await recordAuditLog({
    req, action: 'UPDATE', module: 'roles', entityId: role.id,
    description: `Updated permissions for role "${role.name}"`, oldValue: before.permissions, newValue: role.permissions,
  });
  res.status(200).json(new ApiResponse(200, role, 'Permissions updated successfully'));
});

const listPermissions = asyncHandler(async (req, res) => {
  const permissions = await service.listPermissions();
  res.status(200).json(new ApiResponse(200, permissions));
});

module.exports = { list, getById, create, update, remove, setPermissions, listPermissions };
