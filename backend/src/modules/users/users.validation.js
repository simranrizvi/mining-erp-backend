const Joi = require('joi');

const createUser = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  phone: Joi.string().allow('', null),
  roleId: Joi.string().uuid().required(),
  mineSiteId: Joi.string().uuid().allow(null),
  isActive: Joi.boolean().default(true),
});

const updateUser = Joi.object({
  name: Joi.string().min(2).max(100),
  phone: Joi.string().allow('', null),
  roleId: Joi.string().uuid(),
  mineSiteId: Joi.string().uuid().allow(null),
  isActive: Joi.boolean(),
}).min(1);

const resetPassword = Joi.object({
  newPassword: Joi.string().min(8).required(),
});

module.exports = { createUser, updateUser, resetPassword };
