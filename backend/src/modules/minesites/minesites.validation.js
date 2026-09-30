const Joi = require('joi');

const createMineSite = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  code: Joi.string().min(2).max(20).uppercase().required(),
  location: Joi.string().allow('', null),
  latitude: Joi.number().allow(null),
  longitude: Joi.number().allow(null),
  areaHectares: Joi.number().positive().allow(null),
  status: Joi.string().valid('active', 'inactive', 'closed').default('active'),
  establishedDate: Joi.date().allow(null),
  description: Joi.string().allow('', null),
  managerId: Joi.string().uuid().allow(null),
});

const updateMineSite = createMineSite.fork(
  ['name', 'code'],
  (schema) => schema.optional()
).min(1);

module.exports = { createMineSite, updateMineSite };
