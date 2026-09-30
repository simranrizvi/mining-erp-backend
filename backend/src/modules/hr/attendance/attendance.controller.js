const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/ApiResponse');
const service = require('./attendance.service');
const { recordAuditLog } = require('../../../middleware/auditLog.middleware');

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listAttendance(req.query);
  res.status(200).json(new ApiResponse(200, items, 'Attendance records retrieved', meta));
});

const summary = asyncHandler(async (req, res) => {
  const data = await service.getSummary(req.query);
  res.status(200).json(new ApiResponse(200, data));
});

const checkIn = asyncHandler(async (req, res) => {
  const record = await service.checkIn(req.body);
  await recordAuditLog({
    req, action: 'CREATE', module: 'hr.attendance', entityId: record.id,
    description: `Checked in employee ${record.employee.firstName} ${record.employee.lastName}`,
  });
  res.status(201).json(new ApiResponse(201, record, 'Checked in successfully'));
});

const checkOut = asyncHandler(async (req, res) => {
  const record = await service.checkOut(req.params.id, req.body.checkOut);
  await recordAuditLog({
    req, action: 'UPDATE', module: 'hr.attendance', entityId: record.id,
    description: 'Recorded employee check-out',
  });
  res.status(200).json(new ApiResponse(200, record, 'Checked out successfully'));
});

const bulkMark = asyncHandler(async (req, res) => {
  const records = await service.bulkMark(req.body);
  await recordAuditLog({
    req, action: 'CREATE', module: 'hr.attendance',
    description: `Bulk marked attendance for ${records.length} employees`,
  });
  res.status(201).json(new ApiResponse(201, records, 'Attendance marked successfully'));
});

module.exports = { list, summary, checkIn, checkOut, bulkMark };
