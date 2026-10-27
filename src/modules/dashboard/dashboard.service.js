const { prisma } = require('../../config/db');

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Aggregates headline KPIs from every module that currently exists.
 * Additional counters can be appended here as later phases add modules
 * (equipment uptime, inventory value, fuel burn, financial P&L, etc.)
 * without touching the route or any other module.
 */
async function getOverview(user) {
  const today = startOfDay();
  const monthStart = startOfMonth();

  const mineSiteFilter = user.mineSiteId ? { mineSiteId: user.mineSiteId } : {};

  const [
    totalMineSites,
    activeMineSites,
    totalEmployees,
    activeEmployees,
    todayAttendance,
    pendingLeaveRequests,
    monthProduction,
    todayProduction,
    recentAuditLogs,
  ] = await Promise.all([
    prisma.mineSite.count(),
    prisma.mineSite.count({ where: { status: 'active' } }),
    prisma.employee.count({ where: mineSiteFilter }),
    prisma.employee.count({ where: { ...mineSiteFilter, status: 'active' } }),
    prisma.attendance.groupBy({
      by: ['status'],
      where: { date: today, ...mineSiteFilter },
      _count: true,
    }),
    prisma.leaveRequest.count({ where: { status: 'pending' } }),
    prisma.production.aggregate({ where: { date: { gte: monthStart }, ...mineSiteFilter }, _sum: { quantity: true } }),
    prisma.production.aggregate({ where: { date: { gte: today }, ...mineSiteFilter }, _sum: { quantity: true } }),
    prisma.auditLog.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } },
    }),
  ]);

  const attendanceBreakdown = todayAttendance.reduce((acc, row) => {
    acc[row.status] = row._count;
    return acc;
  }, {});

  return {
    mineSites: { total: totalMineSites, active: activeMineSites },
    employees: { total: totalEmployees, active: activeEmployees },
    attendanceToday: attendanceBreakdown,
    pendingLeaveRequests,
    production: {
      monthToDate: monthProduction._sum.quantity || 0,
      today: todayProduction._sum.quantity || 0,
    },
    recentActivity: recentAuditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      module: log.module,
      description: log.description,
      user: log.user?.name || 'System',
      createdAt: log.createdAt,
    })),
  };
}

/** Production trend over the last N days, for the dashboard line chart. */
async function getProductionTrend(user, days = 14) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const mineSiteFilter = user.mineSiteId ? { mineSiteId: user.mineSiteId } : {};

  const records = await prisma.production.findMany({
    where: { date: { gte: since }, ...mineSiteFilter },
    select: { date: true, quantity: true },
  });

  const byDay = {};
  records.forEach((r) => {
    const key = r.date.toISOString().slice(0, 10);
    byDay[key] = (byDay[key] || 0) + r.quantity;
  });

  return Object.entries(byDay)
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([date, quantity]) => ({ date, quantity }));
}

module.exports = { getOverview, getProductionTrend };
