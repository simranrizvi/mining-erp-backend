/**
 * Master permission catalog. This is the single source of truth for every
 * permission the system understands. The seeder reads this list to create
 * `Permission` rows; the Super Admin can then compose any `Role` out of any
 * subset of these permissions from the UI — no code changes needed to
 * introduce a new custom role.
 *
 * Adding a new capability to the ERP means adding a line here (and
 * guarding the relevant route with it) — roles themselves stay data-driven.
 */

const MODULES = {
  DASHBOARD: 'dashboard',
  USERS: 'users',
  ROLES: 'roles',
  AUDIT_LOGS: 'audit_logs',
  MINE_SITES: 'mine_sites',
  HR_EMPLOYEES: 'hr.employees',
  HR_ATTENDANCE: 'hr.attendance',
  HR_LEAVE: 'hr.leave',
  HR_SHIFTS: 'hr.shifts',
  HR_PAYROLL: 'hr.payroll',
  MINING_PRODUCTION: 'mining.production',
  EQUIPMENT: 'equipment',
  VEHICLES: 'vehicles',
  MAINTENANCE: 'maintenance',
  INVENTORY: 'inventory',
  PROCUREMENT: 'procurement',
  VENDORS: 'vendors',
  FUEL: 'fuel',
  FINANCE_EXPENSES: 'finance.expenses',
  FINANCE_INVOICES: 'finance.invoices',
  FINANCE_PAYMENTS: 'finance.payments',
  FINANCE_BUDGETS: 'finance.budgets',
  REPORTS: 'reports',
  SETTINGS: 'settings',
};

const STANDARD_ACTIONS = ['create', 'read', 'update', 'delete'];

const EXTRA_ACTIONS = {
  [MODULES.HR_LEAVE]: ['approve'],
  [MODULES.PROCUREMENT]: ['approve'],
  [MODULES.FINANCE_EXPENSES]: ['approve'],
  [MODULES.FINANCE_INVOICES]: ['approve'],
  [MODULES.REPORTS]: ['export'],
  [MODULES.USERS]: ['export'],
};

function buildCatalog() {
  const catalog = [];
  Object.values(MODULES).forEach((moduleKey) => {
    const actions = [...STANDARD_ACTIONS, ...(EXTRA_ACTIONS[moduleKey] || [])];
    actions.forEach((action) => {
      catalog.push({
        module: moduleKey,
        action,
        key: `${moduleKey}:${action}`,
        description: `${action.charAt(0).toUpperCase() + action.slice(1)} access for ${moduleKey}`,
      });
    });
  });
  return catalog;
}

module.exports = { MODULES, buildCatalog };
