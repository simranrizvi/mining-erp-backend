const { prisma } = require('../../config/db');

function dateFilter(query, field = 'date') {
  if (!query.from && !query.to) return {};
  return { [field]: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } };
}

async function productionReport(query) {
  const where = { AND: [query.mineSiteId ? { mineSiteId: query.mineSiteId } : {}, dateFilter(query)] };
  const records = await prisma.production.findMany({
    where,
    include: { mineSite: { select: { name: true } }, equipment: { select: { name: true } }, operator: { select: { firstName: true, lastName: true } } },
    orderBy: { date: 'desc' },
  });
  return records.map((r) => ({
    date: r.date.toISOString().slice(0, 10),
    mineSite: r.mineSite?.name || '-',
    materialType: r.materialType,
    quantity: r.quantity,
    unit: r.unit,
    shift: r.shift,
    equipment: r.equipment?.name || '-',
    operator: r.operator ? `${r.operator.firstName} ${r.operator.lastName}` : '-',
  }));
}

async function attendanceReport(query) {
  const where = { AND: [query.mineSiteId ? { mineSiteId: query.mineSiteId } : {}, dateFilter(query)] };
  const records = await prisma.attendance.findMany({
    where,
    include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
    orderBy: { date: 'desc' },
  });
  return records.map((r) => ({
    date: r.date.toISOString().slice(0, 10),
    employeeCode: r.employee.employeeCode,
    employee: `${r.employee.firstName} ${r.employee.lastName}`,
    status: r.status,
    checkIn: r.checkIn ? r.checkIn.toISOString() : '-',
    checkOut: r.checkOut ? r.checkOut.toISOString() : '-',
    hoursWorked: r.hoursWorked || 0,
  }));
}

async function inventoryValuationReport(query) {
  const where = query.warehouseId ? { warehouseId: query.warehouseId } : {};
  const items = await prisma.inventoryItem.findMany({
    where,
    include: { category: { select: { name: true } }, warehouse: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });
  return items.map((i) => ({
    sku: i.sku,
    name: i.name,
    category: i.category?.name || '-',
    warehouse: i.warehouse?.name || '-',
    quantityInStock: i.quantityInStock,
    unit: i.unit,
    unitPrice: i.unitPrice,
    totalValue: Number((i.quantityInStock * i.unitPrice).toFixed(2)),
    reorderLevel: i.reorderLevel,
    lowStock: i.quantityInStock <= i.reorderLevel,
  }));
}

async function financialSummaryReport(query) {
  const where = { AND: [query.mineSiteId ? { mineSiteId: query.mineSiteId } : {}, dateFilter(query)] };
  const expenses = await prisma.expense.findMany({
    where,
    include: { category: { select: { name: true } } },
    orderBy: { date: 'desc' },
  });
  return expenses.map((e) => ({
    expenseNumber: e.expenseNumber,
    date: e.date.toISOString().slice(0, 10),
    category: e.category?.name || '-',
    amount: e.amount,
    paidTo: e.paidTo || '-',
    status: e.status,
  }));
}

async function equipmentUtilizationReport(query) {
  const where = query.mineSiteId ? { mineSiteId: query.mineSiteId } : {};
  const equipment = await prisma.equipment.findMany({
    where,
    include: {
      mineSite: { select: { name: true } },
      maintenanceRecords: { select: { downtimeHours: true, cost: true } },
    },
    orderBy: { name: 'asc' },
  });
  return equipment.map((e) => ({
    code: e.code,
    name: e.name,
    type: e.type,
    mineSite: e.mineSite?.name || '-',
    status: e.status,
    currentHours: e.currentHours,
    totalDowntimeHours: e.maintenanceRecords.reduce((s, m) => s + m.downtimeHours, 0),
    totalMaintenanceCost: e.maintenanceRecords.reduce((s, m) => s + m.cost, 0),
  }));
}

module.exports = { productionReport, attendanceReport, inventoryValuationReport, financialSummaryReport, equipmentUtilizationReport };
