const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./auditlogs.service');

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listAuditLogs(req.query);
  res.status(200).json(new ApiResponse(200, items, 'Audit logs retrieved', meta));
});

module.exports = { list };
