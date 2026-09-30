const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/ApiResponse');
const service = require('./leave.service');
const { recordAuditLog } = require('../../../middleware/auditLog.middleware');

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listLeaveRequests(req.query);
  res.status(200).json(new ApiResponse(200, items, 'Leave requests retrieved', meta));
});

const getById = asyncHandler(async (req, res) => {
  const leave = await service.getLeaveById(req.params.id);
  res.status(200).json(new ApiResponse(200, leave));
});

const apply = asyncHandler(async (req, res) => {
  const leave = await service.applyLeave(req.body);
  await recordAuditLog({
    req, action: 'CREATE', module: 'hr.leave', entityId: leave.id,
    description: `${leave.employee.firstName} ${leave.employee.lastName} applied for ${leave.leaveType.name}`,
  });
  res.status(201).json(new ApiResponse(201, leave, 'Leave request submitted'));
});

const action = asyncHandler(async (req, res) => {
  const leave = await service.actionLeave(req.params.id, req.body, req.user.id);
  await recordAuditLog({
    req, action: req.body.status === 'approved' ? 'APPROVE' : 'REJECT', module: 'hr.leave', entityId: leave.id,
    description: `Leave request ${req.body.status} for ${leave.employee.firstName} ${leave.employee.lastName}`,
  });
  res.status(200).json(new ApiResponse(200, leave, `Leave request ${req.body.status}`));
});

const cancel = asyncHandler(async (req, res) => {
  const leave = await service.cancelLeave(req.params.id);
  await recordAuditLog({ req, action: 'UPDATE', module: 'hr.leave', entityId: leave.id, description: 'Leave request cancelled' });
  res.status(200).json(new ApiResponse(200, leave, 'Leave request cancelled'));
});

module.exports = { list, getById, apply, action, cancel };
