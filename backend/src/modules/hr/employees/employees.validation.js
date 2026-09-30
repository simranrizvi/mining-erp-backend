const Joi = require('joi');

const createEmployee = Joi.object({
  firstName: Joi.string().min(1).max(80).required(),
  lastName: Joi.string().min(1).max(80).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().allow('', null),
  dateOfBirth: Joi.date().allow(null),
  gender: Joi.string().valid('male', 'female', 'other').allow(null),
  address: Joi.string().allow('', null),
  departmentId: Joi.string().uuid().allow(null),
  designation: Joi.string().allow('', null),
  mineSiteId: Joi.string().uuid().allow(null),
  dateOfJoining: Joi.date().default(() => new Date()),
  employmentType: Joi.string().valid('full_time', 'part_time', 'contract').default('full_time'),
  status: Joi.string().valid('active', 'on_leave', 'terminated', 'suspended').default('active'),
  basicSalary: Joi.number().min(0).default(0),
  bankName: Joi.string().allow('', null),
  bankAccountNo: Joi.string().allow('', null),
  emergencyContact: Joi.string().allow('', null),
  createLoginAccount: Joi.boolean().default(false),
  roleId: Joi.string().uuid().when('createLoginAccount', { is: true, then: Joi.required() }),
});

const updateEmployee = Joi.object({
  firstName: Joi.string().min(1).max(80),
  lastName: Joi.string().min(1).max(80),
  phone: Joi.string().allow('', null),
  dateOfBirth: Joi.date().allow(null),
  gender: Joi.string().valid('male', 'female', 'other').allow(null),
  address: Joi.string().allow('', null),
  departmentId: Joi.string().uuid().allow(null),
  designation: Joi.string().allow('', null),
  mineSiteId: Joi.string().uuid().allow(null),
  employmentType: Joi.string().valid('full_time', 'part_time', 'contract'),
  status: Joi.string().valid('active', 'on_leave', 'terminated', 'suspended'),
  basicSalary: Joi.number().min(0),
  bankName: Joi.string().allow('', null),
  bankAccountNo: Joi.string().allow('', null),
  emergencyContact: Joi.string().allow('', null),
}).min(1);

module.exports = { createEmployee, updateEmployee };
