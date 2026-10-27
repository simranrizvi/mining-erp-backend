const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./maintenance.service');
const { recordAuditLog } = require('../../middleware/auditLog.middleware');

const listSchedules = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listSchedules(req.query);
  res.status(200).json(new ApiResponse(200, items, 'Maintenance schedules retrieved', meta));
});

const createSchedule = asyncHandler(async (req, res) => {
  const schedule = await service.createSchedule(req.body);
  await recordAuditLog({ req, action: 'CREATE', module: 'maintenance', entityId: schedule.id, description: 'Created maintenance schedule' });
  res.status(201).json(new ApiResponse(201, schedule, 'Maintenance schedule created'));
});

const updateSchedule = asyncHandler(async (req, res) => {
  const schedule = await service.updateSchedule(req.params.id, req.body);
  await recordAuditLog({ req, action: 'UPDATE', module: 'maintenance', entityId: schedule.id, description: 'Updated maintenance schedule' });
  res.status(200).json(new ApiResponse(200, schedule, 'Maintenance schedule updated'));
});

const deleteSchedule = asyncHandler(async (req, res) => {
  await service.deleteSchedule(req.params.id);
  await recordAuditLog({ req, action: 'DELETE', module: 'maintenance', entityId: req.params.id, description: 'Deleted maintenance schedule' });
  res.status(200).json(new ApiResponse(200, null, 'Maintenance schedule deleted'));
});

const listRecords = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listRecords(req.query);
  res.status(200).json(new ApiResponse(200, items, 'Maintenance records retrieved', meta));
});

const getRecordById = asyncHandler(async (req, res) => {
  const record = await service.getRecordById(req.params.id);
  res.status(200).json(new ApiResponse(200, record));
});

const createRecord = asyncHandler(async (req, res) => {
  const record = await service.createRecord(req.body);
  await recordAuditLog({ req, action: 'CREATE', module: 'maintenance', entityId: record.id, description: 'Logged maintenance record', newValue: record });
  res.status(201).json(new ApiResponse(201, record, 'Maintenance record logged'));
});

const updateRecord = asyncHandler(async (req, res) => {
  const before = await service.getRecordById(req.params.id);
  const record = await service.updateRecord(req.params.id, req.body);
  await recordAuditLog({ req, action: 'UPDATE', module: 'maintenance', entityId: record.id, description: 'Updated maintenance record', oldValue: before, newValue: record });
  res.status(200).json(new ApiResponse(200, record, 'Maintenance record updated'));
});

const deleteRecord = asyncHandler(async (req, res) => {
  const before = await service.getRecordById(req.params.id);
  await service.deleteRecord(req.params.id);
  await recordAuditLog({ req, action: 'DELETE', module: 'maintenance', entityId: req.params.id, description: 'Deleted maintenance record', oldValue: before });
  res.status(200).json(new ApiResponse(200, null, 'Maintenance record deleted'));
});

module.exports = { listSchedules, createSchedule, updateSchedule, deleteSchedule, listRecords, getRecordById, createRecord, updateRecord, deleteRecord };
