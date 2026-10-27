const Joi = require('joi');

const checkIn = Joi.object({
  employeeId: Joi.string().uuid().required(),
  mineSiteId: Joi.string().uuid().allow(null),
  date: Joi.date().default(() => new Date()),
  checkIn: Joi.date().default(() => new Date()),
  status: Joi.string().valid('present', 'absent', 'late', 'half_day', 'on_leave').default('present'),
  remarks: Joi.string().allow('', null),
});

const checkOut = Joi.object({
  checkOut: Joi.date().default(() => new Date()),
});

const bulkMark = Joi.object({
  date: Joi.date().required(),
  mineSiteId: Joi.string().uuid().allow(null),
  entries: Joi.array().items(
    Joi.object({
      employeeId: Joi.string().uuid().required(),
      status: Joi.string().valid('present', 'absent', 'late', 'half_day', 'on_leave').required(),
      remarks: Joi.string().allow('', null),
    })
  ).min(1).required(),
});

module.exports = { checkIn, checkOut, bulkMark };
