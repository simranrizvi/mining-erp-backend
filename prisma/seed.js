/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { buildCatalog, MODULES } = require('../src/config/permissions.catalog');

const prisma = new PrismaClient();

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'admin@miningerp.com';
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'Admin@12345';
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);

/**
 * Declarative role -> permission mapping for the 7 default roles.
 * `'*'` means every action available for that module.
 * These are only the SEEDED defaults — the Super Admin can create
 * additional custom roles and reshape any role's permissions at runtime
 * via the Roles & Permissions module; nothing here is hardcoded elsewhere.
 */
const ROLE_DEFINITIONS = [
  {
    name: 'Super Admin',
    description: 'Full system access: users, roles, permissions, company settings, and every module.',
    isSystem: true,
    modules: { '*': '*' },
  },
  {
    name: 'Operations Admin',
    description: 'Manages daily operations across all modules, monitors dashboards/reports, approves workflows.',
    isSystem: true,
    modules: {
      [MODULES.DASHBOARD]: '*',
      [MODULES.MINE_SITES]: ['read', 'update'],
      [MODULES.HR_EMPLOYEES]: ['read', 'update'],
      [MODULES.HR_ATTENDANCE]: ['read', 'update'],
      [MODULES.HR_LEAVE]: ['read', 'approve'],
      [MODULES.HR_SHIFTS]: ['read'],
      [MODULES.HR_PAYROLL]: ['read'],
      [MODULES.MINING_PRODUCTION]: '*',
      [MODULES.EQUIPMENT]: '*',
      [MODULES.VEHICLES]: '*',
      [MODULES.MAINTENANCE]: '*',
      [MODULES.INVENTORY]: '*',
      [MODULES.PROCUREMENT]: '*',
      [MODULES.VENDORS]: '*',
      [MODULES.FUEL]: '*',
      [MODULES.FINANCE_EXPENSES]: ['read', 'approve'],
      [MODULES.FINANCE_INVOICES]: ['read'],
      [MODULES.FINANCE_PAYMENTS]: ['read'],
      [MODULES.FINANCE_BUDGETS]: ['read'],
      [MODULES.REPORTS]: '*',
      [MODULES.SETTINGS]: ['read'],
      [MODULES.AUDIT_LOGS]: ['read'],
    },
  },
  {
    name: 'HR Manager',
    description: 'Employee management, attendance, leave, shift management, and payroll.',
    isSystem: true,
    modules: {
      [MODULES.DASHBOARD]: ['read'],
      [MODULES.HR_EMPLOYEES]: '*',
      [MODULES.HR_ATTENDANCE]: '*',
      [MODULES.HR_LEAVE]: '*',
      [MODULES.HR_SHIFTS]: '*',
      [MODULES.HR_PAYROLL]: '*',
      [MODULES.SETTINGS]: ['read', 'create'],
      [MODULES.REPORTS]: ['read', 'export'],
    },
  },
  {
    name: 'Mine Manager',
    description: 'Mine site management, production tracking, equipment allocation, daily operational reports.',
    isSystem: true,
    modules: {
      [MODULES.DASHBOARD]: ['read'],
      [MODULES.MINE_SITES]: ['read', 'update'],
      [MODULES.MINING_PRODUCTION]: '*',
      [MODULES.EQUIPMENT]: ['read', 'update'],
      [MODULES.VEHICLES]: ['read', 'update'],
      [MODULES.MAINTENANCE]: ['read', 'create'],
      [MODULES.HR_ATTENDANCE]: ['read', 'create', 'update'],
      [MODULES.HR_EMPLOYEES]: ['read'],
      [MODULES.FUEL]: ['read', 'create'],
      [MODULES.REPORTS]: ['read', 'export'],
    },
  },
  {
    name: 'Inventory Manager',
    description: 'Inventory, warehouse, purchase requests, purchase orders, and vendor management.',
    isSystem: true,
    modules: {
      [MODULES.DASHBOARD]: ['read'],
      [MODULES.INVENTORY]: '*',
      [MODULES.PROCUREMENT]: '*',
      [MODULES.VENDORS]: '*',
      [MODULES.REPORTS]: ['read', 'export'],
    },
  },
  {
    name: 'Finance Manager',
    description: 'Expenses, payments, budget management, financial reports, and invoice management.',
    isSystem: true,
    modules: {
      [MODULES.DASHBOARD]: ['read'],
      [MODULES.FINANCE_EXPENSES]: '*',
      [MODULES.FINANCE_INVOICES]: '*',
      [MODULES.FINANCE_PAYMENTS]: '*',
      [MODULES.FINANCE_BUDGETS]: '*',
      [MODULES.REPORTS]: ['read', 'export'],
      [MODULES.SETTINGS]: ['read'],
    },
  },
  {
    name: 'Employee',
    description: 'Attendance, assigned tasks, production entry, machine operation logs, and leave requests.',
    isSystem: true,
    modules: {
      [MODULES.DASHBOARD]: ['read'],
      [MODULES.HR_ATTENDANCE]: ['read', 'create'],
      [MODULES.HR_LEAVE]: ['read', 'create'],
      [MODULES.MINING_PRODUCTION]: ['read', 'create'],
      [MODULES.EQUIPMENT]: ['read'],
      [MODULES.VEHICLES]: ['read'],
      [MODULES.MAINTENANCE]: ['read', 'create'],
      [MODULES.FUEL]: ['read', 'create'],
    },
  },
];

async function seedPermissions() {
  const catalog = buildCatalog();
  console.log(`Seeding ${catalog.length} permissions...`);
  for (const perm of catalog) {
    await prisma.permission.upsert({ where: { key: perm.key }, update: {}, create: perm });
  }
  return prisma.permission.findMany();
}

function resolvePermissionKeysForRole(moduleMap, allPermissions) {
  if (moduleMap['*'] === '*') return allPermissions.map((p) => p.id);

  const keys = new Set();
  Object.entries(moduleMap).forEach(([moduleKey, actions]) => {
    const matching = allPermissions.filter((p) => p.module === moduleKey);
    if (actions === '*') {
      matching.forEach((p) => keys.add(p.id));
    } else {
      matching.filter((p) => actions.includes(p.action)).forEach((p) => keys.add(p.id));
    }
  });
  return Array.from(keys);
}

async function seedRoles(allPermissions) {
  console.log('Seeding default roles...');
  const roleMap = {};
  for (const def of ROLE_DEFINITIONS) {
    const permissionIds = resolvePermissionKeysForRole(def.modules, allPermissions);
    const role = await prisma.role.upsert({
      where: { name: def.name },
      update: { description: def.description, isSystem: def.isSystem },
      create: { name: def.name, description: def.description, isSystem: def.isSystem },
    });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
      skipDuplicates: true,
    });
    roleMap[def.name] = role;
  }
  return roleMap;
}

async function seedCompanyAndMasterData() {
  console.log('Seeding company profile and master data...');
  const company = await prisma.company.findFirst();
  if (!company) {
    await prisma.company.create({ data: { name: 'Atlas Mining Corporation', currency: 'USD', timezone: 'UTC' } });
  }

  const mineSite = await prisma.mineSite.upsert({
    where: { code: 'MS-01' },
    update: {},
    create: { name: 'Atlas North Pit', code: 'MS-01', location: 'Nevada, USA', status: 'active', establishedDate: new Date('2015-03-01') },
  });

  const departments = ['Operations', 'Human Resources', 'Finance', 'Procurement', 'Maintenance', 'Safety & Compliance'];
  for (const name of departments) {
    const code = name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6);
    await prisma.department.upsert({ where: { name }, update: {}, create: { name, code } });
  }

  const leaveTypes = [
    { name: 'Annual Leave', maxDaysPerYear: 21 },
    { name: 'Sick Leave', maxDaysPerYear: 14 },
    { name: 'Casual Leave', maxDaysPerYear: 7 },
    { name: 'Unpaid Leave', maxDaysPerYear: 0 },
  ];
  for (const lt of leaveTypes) {
    await prisma.leaveType.upsert({ where: { name: lt.name }, update: {}, create: lt });
  }

  const dayShiftExists = await prisma.shift.findFirst({ where: { name: 'Day Shift', mineSiteId: mineSite.id } });
  if (!dayShiftExists) await prisma.shift.create({ data: { name: 'Day Shift', startTime: '06:00', endTime: '18:00', mineSiteId: mineSite.id } });
  const nightShiftExists = await prisma.shift.findFirst({ where: { name: 'Night Shift', mineSiteId: mineSite.id } });
  if (!nightShiftExists) await prisma.shift.create({ data: { name: 'Night Shift', startTime: '18:00', endTime: '06:00', mineSiteId: mineSite.id } });

  const expenseCategories = ['Fuel & Energy', 'Equipment Repairs', 'Office Supplies', 'Travel', 'Utilities', 'Safety Equipment'];
  for (const name of expenseCategories) {
    await prisma.expenseCategory.upsert({ where: { name }, update: {}, create: { name } });
  }

  const inventoryCategories = ['Spare Parts', 'Safety Gear', 'Consumables', 'Tools', 'Lubricants'];
  for (const name of inventoryCategories) {
    await prisma.inventoryCategory.upsert({ where: { name }, update: {}, create: { name } });
  }

  return mineSite;
}

async function seedSuperAdmin(roleMap, mineSite) {
  console.log('Seeding Super Admin user...');
  const existing = await prisma.user.findUnique({ where: { email: SUPER_ADMIN_EMAIL } });
  if (existing) {
    console.log(`Super Admin already exists (${SUPER_ADMIN_EMAIL}). Skipping.`);
    return;
  }
  const hashed = await bcrypt.hash(SUPER_ADMIN_PASSWORD, SALT_ROUNDS);
  await prisma.user.create({
    data: {
      name: 'System Administrator',
      email: SUPER_ADMIN_EMAIL,
      password: hashed,
      roleId: roleMap['Super Admin'].id,
      mineSiteId: mineSite.id,
      isActive: true,
      mustChangePassword: true,
    },
  });
  console.log(`✅ Super Admin created: ${SUPER_ADMIN_EMAIL} / ${SUPER_ADMIN_PASSWORD} (change this password immediately after first login)`);
}

async function main() {
  console.log('🌱 Starting database seed...\n');
  const allPermissions = await seedPermissions();
  const roleMap = await seedRoles(allPermissions);
  const mineSite = await seedCompanyAndMasterData();
  await seedSuperAdmin(roleMap, mineSite);
  console.log('\n✅ Seed complete.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
