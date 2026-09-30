const Joi = require('joi');

const createRole = Joi.object({
  name: Joi.string().min(2).max(60).required(),
  description: Joi.string().allow('', null),
  permissionIds: Joi.array().items(Joi.string().uuid()).default([]),
});

const updateRole = Joi.object({
  name: Joi.string().min(2).max(60),
  description: Joi.string().allow('', null),
  isActive: Joi.boolean(),
}).min(1);

const setPermissions = Joi.object({
  permissionIds: Joi.array().items(Joi.string().uuid()).required(),
});

module.exports = { createRole, updateRole, setPermissions };
