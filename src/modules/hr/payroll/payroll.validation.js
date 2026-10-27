const Joi = require('joi');

const createPayroll = Joi.object({
  employeeId: Joi.string().uuid().required(),
  month: Joi.number().integer().min(1).max(12).required(),
  year: Joi.number().integer().min(2000).max(2100).required(),
  basicSalary: Joi.number().min(0).required(),
  allowances: Joi.number().min(0).default(0),
  deductions: Joi.number().min(0).default(0),
  overtimePay: Joi.number().min(0).default(0),
});

const updatePayroll = Joi.object({
  basicSalary: Joi.number().min(0),
  allowances: Joi.number().min(0),
  deductions: Joi.number().min(0),
  overtimePay: Joi.number().min(0),
}).min(1);

const actionPayroll = Joi.object({
  status: Joi.string().valid('processed', 'paid').required(),
});

const generatePayroll = Joi.object({
  month: Joi.number().integer().min(1).max(12).required(),
  year: Joi.number().integer().min(2000).max(2100).required(),
});

module.exports = { createPayroll, updatePayroll, actionPayroll, generatePayroll };
