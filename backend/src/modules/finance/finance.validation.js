const Joi = require('joi');

const createExpenseCategory = Joi.object({ name: Joi.string().min(2).max(80).required() });

const createExpense = Joi.object({
  categoryId: Joi.string().uuid().allow(null),
  mineSiteId: Joi.string().uuid().allow(null),
  amount: Joi.number().positive().required(),
  date: Joi.date().default(() => new Date()),
  description: Joi.string().allow('', null),
  paidTo: Joi.string().allow('', null),
  paymentMethod: Joi.string().valid('cash', 'bank_transfer', 'cheque', 'card').default('cash'),
});
const actionExpense = Joi.object({ status: Joi.string().valid('approved', 'rejected').required() });

const createInvoice = Joi.object({
  type: Joi.string().valid('sales', 'purchase').default('purchase'),
  partyName: Joi.string().required(),
  amount: Joi.number().positive().required(),
  tax: Joi.number().min(0).default(0),
  dueDate: Joi.date().allow(null),
  issueDate: Joi.date().default(() => new Date()),
  purchaseOrderId: Joi.string().uuid().allow(null),
});
const updateInvoiceStatus = Joi.object({ status: Joi.string().valid('draft', 'sent', 'paid', 'overdue', 'cancelled').required() });

const createPayment = Joi.object({
  invoiceId: Joi.string().uuid().allow(null),
  expenseId: Joi.string().uuid().allow(null),
  amount: Joi.number().positive().required(),
  method: Joi.string().default('bank_transfer'),
  date: Joi.date().default(() => new Date()),
  reference: Joi.string().allow('', null),
}).or('invoiceId', 'expenseId');

const createBudget = Joi.object({
  mineSiteId: Joi.string().uuid().allow(null),
  department: Joi.string().allow('', null),
  category: Joi.string().required(),
  fiscalYear: Joi.number().integer().min(2000).max(2100).required(),
  period: Joi.string().valid('monthly', 'quarterly', 'yearly').default('yearly'),
  allocatedAmount: Joi.number().positive().required(),
});
const updateBudget = createBudget.fork(['category', 'fiscalYear', 'allocatedAmount'], (s) => s.optional()).min(1);

module.exports = { createExpenseCategory, createExpense, actionExpense, createInvoice, updateInvoiceStatus, createPayment, createBudget, updateBudget };
