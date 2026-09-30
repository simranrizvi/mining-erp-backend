const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./finance.service');
const { recordAuditLog } = require('../../middleware/auditLog.middleware');

const listExpenseCategories = asyncHandler(async (req, res) => res.status(200).json(new ApiResponse(200, await service.listExpenseCategories())));
const createExpenseCategory = asyncHandler(async (req, res) => {
  const c = await service.createExpenseCategory(req.body);
  res.status(201).json(new ApiResponse(201, c, 'Expense category created'));
});

const listExpenses = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listExpenses(req.query);
  res.status(200).json(new ApiResponse(200, items, 'Expenses retrieved', meta));
});
const getExpenseById = asyncHandler(async (req, res) => res.status(200).json(new ApiResponse(200, await service.getExpenseById(req.params.id))));
const createExpense = asyncHandler(async (req, res) => {
  const expense = await service.createExpense(req.body, req.user.id);
  await recordAuditLog({ req, action: 'CREATE', module: 'finance.expenses', entityId: expense.id, description: `Submitted expense ${expense.expenseNumber} for ${expense.amount}` });
  res.status(201).json(new ApiResponse(201, expense, 'Expense submitted'));
});
const actionExpense = asyncHandler(async (req, res) => {
  const expense = await service.actionExpense(req.params.id, req.body.status, req.user.id);
  await recordAuditLog({ req, action: req.body.status === 'approved' ? 'APPROVE' : 'REJECT', module: 'finance.expenses', entityId: expense.id, description: `Expense ${expense.expenseNumber} ${req.body.status}` });
  res.status(200).json(new ApiResponse(200, expense, `Expense ${req.body.status}`));
});

const listInvoices = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listInvoices(req.query);
  res.status(200).json(new ApiResponse(200, items, 'Invoices retrieved', meta));
});
const getInvoiceById = asyncHandler(async (req, res) => res.status(200).json(new ApiResponse(200, await service.getInvoiceById(req.params.id))));
const createInvoice = asyncHandler(async (req, res) => {
  const invoice = await service.createInvoice(req.body);
  await recordAuditLog({ req, action: 'CREATE', module: 'finance.invoices', entityId: invoice.id, description: `Created invoice ${invoice.invoiceNumber}` });
  res.status(201).json(new ApiResponse(201, invoice, 'Invoice created'));
});
const updateInvoiceStatus = asyncHandler(async (req, res) => {
  const invoice = await service.updateInvoiceStatus(req.params.id, req.body.status);
  await recordAuditLog({ req, action: 'UPDATE', module: 'finance.invoices', entityId: invoice.id, description: `Invoice ${invoice.invoiceNumber} marked ${req.body.status}` });
  res.status(200).json(new ApiResponse(200, invoice, 'Invoice status updated'));
});

const listPayments = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listPayments(req.query);
  res.status(200).json(new ApiResponse(200, items, 'Payments retrieved', meta));
});
const createPayment = asyncHandler(async (req, res) => {
  const payment = await service.createPayment(req.body, req.user.id);
  await recordAuditLog({ req, action: 'CREATE', module: 'finance.payments', entityId: payment.id, description: `Recorded payment ${payment.paymentNumber} for ${payment.amount}` });
  res.status(201).json(new ApiResponse(201, payment, 'Payment recorded'));
});

const listBudgets = asyncHandler(async (req, res) => res.status(200).json(new ApiResponse(200, await service.listBudgets(req.query))));
const createBudget = asyncHandler(async (req, res) => {
  const budget = await service.createBudget(req.body);
  await recordAuditLog({ req, action: 'CREATE', module: 'finance.budgets', entityId: budget.id, description: `Created budget for ${budget.category} FY${budget.fiscalYear}` });
  res.status(201).json(new ApiResponse(201, budget, 'Budget created'));
});
const updateBudget = asyncHandler(async (req, res) => {
  const budget = await service.updateBudget(req.params.id, req.body);
  await recordAuditLog({ req, action: 'UPDATE', module: 'finance.budgets', entityId: budget.id, description: 'Updated budget' });
  res.status(200).json(new ApiResponse(200, budget, 'Budget updated'));
});

const summary = asyncHandler(async (req, res) => res.status(200).json(new ApiResponse(200, await service.getFinancialSummary(req.query))));

module.exports = {
  listExpenseCategories, createExpenseCategory,
  listExpenses, getExpenseById, createExpense, actionExpense,
  listInvoices, getInvoiceById, createInvoice, updateInvoiceStatus,
  listPayments, createPayment,
  listBudgets, createBudget, updateBudget,
  summary,
};
