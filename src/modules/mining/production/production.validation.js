const Joi = require('joi');

const createProduction = Joi.object({
  mineSiteId: Joi.string().uuid().required(),
  date: Joi.date().default(() => new Date()),
  shift: Joi.string().valid('day', 'night').default('day'),
  materialType: Joi.string().min(1).max(80).required(),
  quantity: Joi.number().positive().required(),
  unit: Joi.string().default('tons'),
  qualityGrade: Joi.string().allow('', null),
  equipmentId: Joi.string().uuid().allow(null),
  operatorId: Joi.string().uuid().allow(null),
  remarks: Joi.string().allow('', null),
});

const updateProduction = createProduction.fork(['mineSiteId', 'materialType', 'quantity'], (s) => s.optional()).min(1);

module.exports = { createProduction, updateProduction };
