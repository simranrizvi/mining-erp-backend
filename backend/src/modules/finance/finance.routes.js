const express = require('express');
const controller = require('./finance.controller');
const validate = require('../../middleware/validate.middleware');
const schema = require('./finance.validation');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

const router = express.Router();
router.use(authenticate);

router.get('/summary', authorize('finance.expenses:read'), controller.summary);

router.get('/expense-categories', authorize('finance.expenses:read'), controller.listExpenseCategories);
router.post('/expense-categories', authorize('finance.expenses:create'), validate(schema.createExpenseCategory), controller.createExpenseCategory);

router.get('/expenses', authorize('finance.expenses:read'), controller.listExpenses);
router.get('/expenses/:id', authorize('finance.expenses:read'), controller.getExpenseById);
router.post('/expenses', authorize('finance.expenses:create'), validate(schema.createExpense), controller.createExpense);
router.patch('/expenses/:id/action', authorize('finance.expenses:approve'), validate(schema.actionExpense), controller.actionExpense);

router.get('/invoices', authorize('finance.invoices:read'), controller.listInvoices);
router.get('/invoices/:id', authorize('finance.invoices:read'), controller.getInvoiceById);
router.post('/invoices', authorize('finance.invoices:create'), validate(schema.createInvoice), controller.createInvoice);
router.patch('/invoices/:id/status', authorize('finance.invoices:update'), validate(schema.updateInvoiceStatus), controller.updateInvoiceStatus);

router.get('/payments', authorize('finance.payments:read'), controller.listPayments);
router.post('/payments', authorize('finance.payments:create'), validate(schema.createPayment), controller.createPayment);

router.get('/budgets', authorize('finance.budgets:read'), controller.listBudgets);
router.post('/budgets', authorize('finance.budgets:create'), validate(schema.createBudget), controller.createBudget);
router.patch('/budgets/:id', authorize('finance.budgets:update'), validate(schema.updateBudget), controller.updateBudget);

module.exports = router;
