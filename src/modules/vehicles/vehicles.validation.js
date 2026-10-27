const Joi = require('joi');

const createVehicle = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  plateNumber: Joi.string().min(2).max(30).uppercase().required(),
  type: Joi.string().required(),
  make: Joi.string().allow('', null),
  model: Joi.string().allow('', null),
  year: Joi.number().integer().min(1980).max(2100).allow(null),
  mineSiteId: Joi.string().uuid().allow(null),
  status: Joi.string().valid('operational', 'under_maintenance', 'breakdown', 'retired').default('operational'),
  currentOdometer: Joi.number().min(0).default(0),
  fuelType: Joi.string().default('diesel'),
  assignedDriverId: Joi.string().uuid().allow(null),
  purchaseDate: Joi.date().allow(null),
  purchaseCost: Joi.number().min(0).allow(null),
});

const updateVehicle = createVehicle.fork(['name', 'plateNumber', 'type'], (s) => s.optional()).min(1);
const changeStatus = Joi.object({ status: Joi.string().valid('operational', 'under_maintenance', 'breakdown', 'retired').required() });

module.exports = { createVehicle, updateVehicle, changeStatus };
