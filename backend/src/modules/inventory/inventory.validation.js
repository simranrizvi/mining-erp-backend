const Joi = require('joi');

const createWarehouse = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  mineSiteId: Joi.string().uuid().allow(null),
  location: Joi.string().allow('', null),
  capacity: Joi.number().min(0).allow(null),
});
const updateWarehouse = createWarehouse.fork(['name'], (s) => s.optional()).min(1);

const createCategory = Joi.object({ name: Joi.string().min(2).max(80).required() });

const createItem = Joi.object({
  sku: Joi.string().min(1).max(40).uppercase().required(),
  name: Joi.string().min(1).max(150).required(),
  categoryId: Joi.string().uuid().allow(null),
  unit: Joi.string().default('pcs'),
  quantityInStock: Joi.number().min(0).default(0),
  reorderLevel: Joi.number().min(0).default(0),
  unitPrice: Joi.number().min(0).default(0),
  warehouseId: Joi.string().uuid().allow(null),
});
const updateItem = createItem.fork(['sku', 'name'], (s) => s.optional()).min(1);

const stockMovement = Joi.object({
  itemId: Joi.string().uuid().required(),
  warehouseId: Joi.string().uuid().allow(null),
  type: Joi.string().valid('in', 'out', 'adjustment').required(),
  quantity: Joi.number().positive().required(),
  reference: Joi.string().allow('', null),
  remarks: Joi.string().allow('', null),
});

module.exports = { createWarehouse, updateWarehouse, createCategory, createItem, updateItem, stockMovement };
