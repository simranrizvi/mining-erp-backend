const Joi = require('joi');

const updateCompany = Joi.object({
  name: Joi.string().min(2).max(150),
  address: Joi.string().allow('', null),
  phone: Joi.string().allow('', null),
  email: Joi.string().email().allow('', null),
  taxId: Joi.string().allow('', null),
  currency: Joi.string().length(3).uppercase(),
  timezone: Joi.string(),
}).min(1);

const upsertSetting = Joi.object({
  key: Joi.string().min(1).max(100).required(),
  value: Joi.string().required(),
  category: Joi.string().default('general'),
  description: Joi.string().allow('', null),
});

const nameOnly = Joi.object({ name: Joi.string().min(2).max(100).required() });

const createLeaveType = Joi.object({
  name: Joi.string().min(2).max(80).required(),
  maxDaysPerYear: Joi.number().integer().min(0).default(0),
});

const createShift = Joi.object({
  name: Joi.string().min(2).max(60).required(),
  startTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).required(),
  endTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).required(),
  mineSiteId: Joi.string().uuid().allow(null),
});

module.exports = { updateCompany, upsertSetting, nameOnly, createLeaveType, createShift };
