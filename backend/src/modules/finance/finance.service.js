const { prisma } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { genCode } = require('../../utils/codeGenerator');
const { parsePagination, buildMeta } = require('../../utils/pagination');

// ---- Expense Categories ----
async function listExpenseCategories() {
  return prisma.expenseCategory.findMany({ orderBy: { name: 'asc' } });
}
async function createExpenseCategory(data) {
  const existing = await prisma.expenseCategory.findUnique({ where: { name: data.name } });
  if (existing) throw ApiError.conflict('A category with this name already exists.');
  return prisma.expenseCategory.create({ data });
}

// ---- Expenses ----
const expenseInclude = { category: { select: { id: true, name: true } }, mineSite: { select: { id: true, name: true } } };

async function listExpenses(query) {
  const { page, limit, skip, take, orderBy } = parsePagination(query);
  const where = {
    AND: [
      query.status ? { status: query.status } : {},
      query.categoryId ? { categoryId: query.categoryId } : {},
      query.mineSiteId ? { mineSiteId: query.mineSiteId } : {},
      query.from || query.to
        ? { date: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } }
        : {},
    ],
  };
  const [items, total, agg] = await Promise.all([
    prisma.expense.findMany({ where, skip, take, orderBy, include: expenseInclude }),
    prisma.expense.count({ where }),
    prisma.expense.aggregate({ where, _sum: { amount: true } }),
  ]);
  return { items, meta: { ...buildMeta(total, page, limit), totalAmount: agg._sum.amount || 0 } };
}
async function getExpenseById(id) {
  const expense = await prisma.expense.findUnique({ where: { id }, include: expenseInclude });
  if (!expense) throw ApiError.notFound('Expense not found.');
  return expense;
}
async function createExpense(data, submittedById) {
  return prisma.expense.create({ data: { ...data, expenseNumber: genCode('EXP'), submittedById }, include: expenseInclude });
}
async function actionExpense(id, status, approvedById) {
  const expense = await getExpenseById(id);
  if (expense.status !== 'pending') throw ApiError.badRequest('This expense has already been actioned.');
  return prisma.expense.update({ where: { id }, data: { status, approvedById }, include: expenseInclude });
}

// ---- Invoices ----
async function listInvoices(query) {
  const { page, limit, skip, take, orderBy } = parsePagination({ ...query, sortBy: query.sortBy || 'issueDate' });
  const where = { AND: [query.status ? { status: query.status } : {}, query.type ? { type: query.type } : {}] };
  const [items, total] = await Promise.all([
    prisma.invoice.findMany({ where, skip, take, orderBy }),
    prisma.invoice.count({ where }),
  ]);
  return { items, meta: buildMeta(total, page, limit) };
}
async function getInvoiceById(id) {
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) throw ApiError.notFound('Invoice not found.');
  return invoice;
}
async function createInvoice(data) {
  const totalAmount = data.amount + (data.tax || 0);
  return prisma.invoice.create({ data: { ...data, totalAmount, invoiceNumber: genCode('INV') } });
}
async function updateInvoiceStatus(id, status) {
  await getInvoiceById(id);
  return prisma.invoice.update({ where: { id }, data: { status } });
}

// ---- Payments ----
async function listPayments(query) {
  const { page, limit, skip, take, orderBy } = parsePagination({ ...query, sortBy: query.sortBy || 'date' });
  const where = { AND: [query.invoiceId ? { invoiceId: query.invoiceId } : {}, query.expenseId ? { expenseId: query.expenseId } : {}] };
  const [items, total] = await Promise.all([
    prisma.payment.findMany({ where, skip, take, orderBy, include: { invoice: { select: { id: true, invoiceNumber: true } }, expense: { select: { id: true, expenseNumber: true } } } }),
    prisma.payment.count({ where }),
  ]);
  return { items, meta: buildMeta(total, page, limit) };
}
async function createPayment(data, processedById) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({ data: { ...data, paymentNumber: genCode('PAY'), processedById } });
    if (data.invoiceId) await tx.invoice.update({ where: { id: data.invoiceId }, data: { status: 'paid' } });
    if (data.expenseId) await tx.expense.update({ where: { id: data.expenseId }, data: { status: 'paid' } });
    return payment;
  });
}

// ---- Budgets ----
async function listBudgets(query) {
  const where = { AND: [query.mineSiteId ? { mineSiteId: query.mineSiteId } : {}, query.fiscalYear ? { fiscalYear: parseInt(query.fiscalYear, 10) } : {}] };
  return prisma.budget.findMany({ where, include: { mineSite: { select: { id: true, name: true } } }, orderBy: { fiscalYear: 'desc' } });
}
async function createBudget(data) {
  return prisma.budget.create({ data });
}
async function updateBudget(id, data) {
  const budget = await prisma.budget.findUnique({ where: { id } });
  if (!budget) throw ApiError.notFound('Budget not found.');
  return prisma.budget.update({ where: { id }, data });
}

// ---- Financial Summary (for dashboard/reports) ----
async function getFinancialSummary(query) {
  const where = query.mineSiteId ? { mineSiteId: query.mineSiteId } : {};
  const [totalExpensesAgg, paidExpensesAgg, pendingExpensesCount, totalInvoicedAgg, totalPaidAgg, budgets] = await Promise.all([
    prisma.expense.aggregate({ where, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { ...where, status: 'paid' }, _sum: { amount: true } }),
    prisma.expense.count({ where: { ...where, status: 'pending' } }),
    prisma.invoice.aggregate({ _sum: { totalAmount: true } }),
    prisma.payment.aggregate({ _sum: { amount: true } }),
    prisma.budget.findMany({ where }),
  ]);

  const totalAllocated = budgets.reduce((sum, b) => sum + b.allocatedAmount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spentAmount, 0);

  return {
    totalExpenses: totalExpensesAgg._sum.amount || 0,
    paidExpenses: paidExpensesAgg._sum.amount || 0,
    pendingExpensesCount,
    totalInvoiced: totalInvoicedAgg._sum.totalAmount || 0,
    totalPaid: totalPaidAgg._sum.amount || 0,
    budget: { allocated: totalAllocated, spent: totalSpent, remaining: totalAllocated - totalSpent },
  };
}

module.exports = {
  listExpenseCategories, createExpenseCategory,
  listExpenses, getExpenseById, createExpense, actionExpense,
  listInvoices, getInvoiceById, createInvoice, updateInvoiceStatus,
  listPayments, createPayment,
  listBudgets, createBudget, updateBudget,
  getFinancialSummary,
};
