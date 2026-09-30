const Joi = require('joi');

const createVendor = Joi.object({
  name: Joi.string().min(2).max(150).required(),
  contactPerson: Joi.string().allow('', null),
  email: Joi.string().email().allow('', null),
  phone: Joi.string().allow('', null),
  address: Joi.string().allow('', null),
  category: Joi.string().allow('', null),
  status: Joi.string().valid('active', 'inactive', 'blacklisted').default('active'),
  rating: Joi.number().min(0).max(5).allow(null),
});
const updateVendor = createVendor.fork(['name'], (s) => s.optional()).min(1);

const requestItem = Joi.object({
  itemId: Joi.string().uuid().allow(null),
  description: Joi.string().required(),
  quantity: Joi.number().positive().required(),
  estimatedCost: Joi.number().min(0).default(0),
});

const createPurchaseRequest = Joi.object({
  mineSiteId: Joi.string().uuid().allow(null),
  justification: Joi.string().allow('', null),
  requiredDate: Joi.date().allow(null),
  items: Joi.array().items(requestItem).min(1).required(),
});

const actionPurchaseRequest = Joi.object({
  status: Joi.string().valid('approved', 'rejected').required(),
  actionRemarks: Joi.string().allow('', null),
});

const orderItem = Joi.object({
  itemId: Joi.string().uuid().allow(null),
  description: Joi.string().required(),
  quantity: Joi.number().positive().required(),
  unitPrice: Joi.number().min(0).required(),
});

const createPurchaseOrder = Joi.object({
  vendorId: Joi.string().uuid().required(),
  purchaseRequestId: Joi.string().uuid().allow(null),
  expectedDeliveryDate: Joi.date().allow(null),
  items: Joi.array().items(orderItem).min(1).required(),
});

const receiveItems = Joi.object({
  receipts: Joi.array().items(
    Joi.object({ purchaseOrderItemId: Joi.string().uuid().required(), receivedQuantity: Joi.number().positive().required() })
  ).min(1).required(),
});

module.exports = { createVendor, updateVendor, createPurchaseRequest, actionPurchaseRequest, createPurchaseOrder, receiveItems };
