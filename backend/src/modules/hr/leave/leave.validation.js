const Joi = require('joi');

const applyLeave = Joi.object({
  employeeId: Joi.string().uuid().required(),
  leaveTypeId: Joi.string().uuid().required(),
  startDate: Joi.date().required(),
  endDate: Joi.date().min(Joi.ref('startDate')).required(),
  reason: Joi.string().allow('', null),
});

const actionLeave = Joi.object({
  status: Joi.string().valid('approved', 'rejected').required(),
  actionRemarks: Joi.string().allow('', null),
});

module.exports = { applyLeave, actionLeave };
