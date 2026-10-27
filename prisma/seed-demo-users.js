/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const PASSWORD = process.env.SEED_USER_PASSWORD || 'Admin@12345';

const USERS = [
  { roleName: 'Operations Admin', name: 'Operations Admin', email: 'ops@miningerp.com' },
  { roleName: 'HR Manager', name: 'HR Manager', email: 'hr@miningerp.com' },
  { roleName: 'Mine Manager', name: 'Mine Manager', email: 'mine@miningerp.com' },
  { roleName: 'Inventory Manager', name: 'Inventory Manager', email: 'inventory@miningerp.com' },
  { roleName: 'Finance Manager', name: 'Finance Manager', email: 'finance@miningerp.com' },
  { roleName: 'Employee', name: 'Demo Employee', email: 'employee@miningerp.com' },
];

async function main() {
  const site = await prisma.mineSite.findFirst();
  const hashed = bcrypt.hashSync(PASSWORD, 10);
  for (const u of USERS) {
    const role = await prisma.role.findUnique({ where: { name: u.roleName } });
    if (!role) {
      console.log(`role missing: ${u.roleName}`);
      continue;
    }
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      console.log(`exists: ${u.email}`);
      continue;
    }
    await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        password: hashed,
        roleId: role.id,
        mineSiteId: site ? site.id : undefined,
        isActive: true,
        mustChangePassword: false,
      },
    });
    console.log(`created: ${u.email}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
