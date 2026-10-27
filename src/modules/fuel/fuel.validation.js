const Joi = require('joi');

const createStation = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  mineSiteId: Joi.string().uuid().allow(null),
  capacity: Joi.number().min(0).default(0),
  currentStock: Joi.number().min(0).default(0),
  fuelType: Joi.string().default('diesel'),
});
const updateStation = createStation.fork(['name'], (s) => s.optional()).min(1);

const createTransaction = Joi.object({
  fuelStationId: Joi.string().uuid().required(),
  vehicleId: Joi.string().uuid().allow(null),
  equipmentId: Joi.string().uuid().allow(null),
  quantity: Joi.number().positive().required(),
  odometerReading: Joi.number().min(0).allow(null),
  cost: Joi.number().min(0).required(),
  date: Joi.date().default(() => new Date()),
  purpose: Joi.string().allow('', null),
}).or('vehicleId', 'equipmentId');

const createPurchase = Joi.object({
  fuelStationId: Joi.string().uuid().required(),
  vendorId: Joi.string().uuid().allow(null),
  quantity: Joi.number().positive().required(),
  cost: Joi.number().min(0).required(),
  purchaseDate: Joi.date().default(() => new Date()),
  invoiceNumber: Joi.string().allow('', null),
});

module.exports = { createStation, updateStation, createTransaction, createPurchase };
