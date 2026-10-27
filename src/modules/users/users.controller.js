const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./users.service');
const { recordAuditLog } = require('../../middleware/auditLog.middleware');

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listUsers(req.query);
  res.status(200).json(new ApiResponse(200, items, 'Users retrieved', meta));
});

const getById = asyncHandler(async (req, res) => {
  const user = await service.getUserById(req.params.id);
  res.status(200).json(new ApiResponse(200, user));
});

const create = asyncHandler(async (req, res) => {
  const user = await service.createUser(req.body, req.user.id);
  await recordAuditLog({
    req, action: 'CREATE', module: 'users', entityId: user.id,
    description: `Created user ${user.email}`, newValue: user,
  });
  res.status(201).json(new ApiResponse(201, user, 'User created successfully'));
});

const update = asyncHandler(async (req, res) => {
  const before = await service.getUserById(req.params.id);
  const user = await service.updateUser(req.params.id, req.body);
  await recordAuditLog({
    req, action: 'UPDATE', module: 'users', entityId: user.id,
    description: `Updated user ${user.email}`, oldValue: before, newValue: user,
  });
  res.status(200).json(new ApiResponse(200, user, 'User updated successfully'));
});

const remove = asyncHandler(async (req, res) => {
  const before = await service.getUserById(req.params.id);
  await service.deleteUser(req.params.id, req.user.id);
  await recordAuditLog({
    req, action: 'DELETE', module: 'users', entityId: req.params.id,
    description: `Deleted user ${before.email}`, oldValue: before,
  });
  res.status(200).json(new ApiResponse(200, null, 'User deleted successfully'));
});

const resetPassword = asyncHandler(async (req, res) => {
  await service.resetPassword(req.params.id, req.body.newPassword);
  await recordAuditLog({
    req, action: 'UPDATE', module: 'users', entityId: req.params.id,
    description: `Reset password for user ${req.params.id}`,
  });
  res.status(200).json(new ApiResponse(200, null, 'Password reset successfully'));
});

module.exports = { list, getById, create, update, remove, resetPassword };
