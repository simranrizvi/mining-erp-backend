const Joi = require('joi');

const createSchedule = Joi.object({
  equipmentId: Joi.string().uuid().allow(null),
  vehicleId: Joi.string().uuid().allow(null),
  type: Joi.string().valid('preventive', 'corrective').default('preventive'),
  frequencyDays: Joi.number().integer().min(1).allow(null),
  scheduledDate: Joi.date().required(),
  description: Joi.string().allow('', null),
}).xor('equipmentId', 'vehicleId');

const updateSchedule = Joi.object({
  type: Joi.string().valid('preventive', 'corrective'),
  frequencyDays: Joi.number().integer().min(1).allow(null),
  scheduledDate: Joi.date(),
  description: Joi.string().allow('', null),
  status: Joi.string().valid('scheduled', 'completed', 'overdue', 'cancelled'),
}).min(1);

const createRecord = Joi.object({
  equipmentId: Joi.string().uuid().allow(null),
  vehicleId: Joi.string().uuid().allow(null),
  maintenanceType: Joi.string().default('preventive'),
  description: Joi.string().allow('', null),
  cost: Joi.number().min(0).default(0),
  performedById: Joi.string().uuid().allow(null),
  vendorId: Joi.string().uuid().allow(null),
  startDate: Joi.date().default(() => new Date()),
  endDate: Joi.date().allow(null),
  status: Joi.string().valid('in_progress', 'completed', 'cancelled').default('in_progress'),
  partsUsed: Joi.array().items(Joi.object({ name: Joi.string().required(), quantity: Joi.number().required(), cost: Joi.number().min(0) })).default([]),
  downtimeHours: Joi.number().min(0).default(0),
}).xor('equipmentId', 'vehicleId');

const updateRecord = Joi.object({
  description: Joi.string().allow('', null),
  cost: Joi.number().min(0),
  endDate: Joi.date().allow(null),
  status: Joi.string().valid('in_progress', 'completed', 'cancelled'),
  partsUsed: Joi.array().items(Joi.object({ name: Joi.string().required(), quantity: Joi.number().required(), cost: Joi.number().min(0) })),
  downtimeHours: Joi.number().min(0),
}).min(1);

module.exports = { createSchedule, updateSchedule, createRecord, updateRecord };
