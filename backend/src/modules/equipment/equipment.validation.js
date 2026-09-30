const Joi = require('joi');

const createEquipment = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  code: Joi.string().min(2).max(30).uppercase().required(),
  type: Joi.string().required(),
  category: Joi.string().default('heavy_machinery'),
  manufacturer: Joi.string().allow('', null),
  model: Joi.string().allow('', null),
  serialNumber: Joi.string().allow('', null),
  mineSiteId: Joi.string().uuid().allow(null),
  purchaseDate: Joi.date().allow(null),
  purchaseCost: Joi.number().min(0).allow(null),
  status: Joi.string().valid('operational', 'under_maintenance', 'breakdown', 'retired').default('operational'),
  currentHours: Joi.number().min(0).default(0),
  assignedOperatorId: Joi.string().uuid().allow(null),
});

const updateEquipment = createEquipment.fork(['name', 'code', 'type'], (s) => s.optional()).min(1);

const changeStatus = Joi.object({
  status: Joi.string().valid('operational', 'under_maintenance', 'breakdown', 'retired').required(),
});

module.exports = { createEquipment, updateEquipment, changeStatus };
