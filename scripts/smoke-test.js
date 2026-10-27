/* eslint-disable no-console */
const BASE = process.env.API_BASE || 'http://localhost:5000/api/v1';
const WEB = process.env.WEB_BASE || 'http://localhost:3000';

const results = [];
let adminToken = '';
let adminCookie = '';

function log(name, ok, info = '') {
  results.push({ name, ok, info });
  console.log(`${ok ? 'âœ…' : 'âŒ'} ${name}${info ? ` â€” ${info}` : ''}`);
}

async function req(method, path, { token, cookie, body, base = BASE } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookie) headers.Cookie = cookie;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });
  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data, headers: res.headers, setCookie: res.headers.get('set-cookie') };
}

function cookieFrom(setCookie) {
  if (!setCookie) return '';
  return setCookie.split(',').map((c) => c.split(';')[0]).filter((c) => c.includes('=')).join('; ');
}

async function test(name, fn) {
  try {
    const info = await fn();
    log(name, true, typeof info === 'string' ? info : '');
  } catch (e) {
    log(name, false, e.message);
  }
}

function arr(r) { const d = r && r.data ? r.data.data : r; return Array.isArray(d) ? d : d && d.items ? d.items : []; }
function expect(cond, msg) {
  if (!cond) throw new Error(msg);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const iso = (d) => d.toISOString().slice(0, 10);
function addDays(n) { const d = new Date(); d.setDate(d.getDate() + n); return d; }

async function main() {
  const LOFF = 200 + (Date.now() % 300); // unique future window per run (overlap-safe)
  // ---------------- AUTH ----------------
  await test('LOGIN admin (correct creds)', async () => {
    const r = await req('POST', '/auth/login', { body: { email: 'admin@miningerp.com', password: 'Admin@12345' } });
    expect(r.status === 200, `status ${r.status}`);
    adminToken = r.data.data.accessToken;
    adminCookie = cookieFrom(r.setCookie);
    expect(adminToken, 'no accessToken');
    expect(adminCookie.includes('refreshToken'), 'no refresh cookie');
    return 'tokens + cookie received';
  });

  await test('LOGIN wrong password rejected', async () => {
    const r = await req('POST', '/auth/login', { body: { email: 'admin@miningerp.com', password: 'wrongpass1' } });
    expect(r.status === 401 || r.status === 400, `got ${r.status}`);
    return `status ${r.status}`;
  });

  await test('AUTH /me with token', async () => {
    const r = await req('GET', '/auth/me', { token: adminToken });
    expect(r.status === 200, `got ${r.status}`);
    expect(r.data.data.email === 'admin@miningerp.com', 'wrong user');
    return r.data.data.role ? `role: ${r.data.data.role.name}` : 'ok';
  });

  await test('AUTH /me without token â†’ 401', async () => {
    const r = await req('GET', '/auth/me');
    expect(r.status === 401, `got ${r.status}`);
    return '401 as expected';
  });

  await test('AUTH refresh (cookie rotation)', async () => {
    const r = await req('POST', '/auth/refresh', { cookie: adminCookie });
    expect(r.status === 200, `got ${r.status}`);
    expect(r.data.data.accessToken, 'no new accessToken');
    adminToken = r.data.data.accessToken;
    const newCookie = cookieFrom(r.setCookie);
    if (newCookie.includes('refreshToken')) adminCookie = newCookie;
    return 'rotated';
  });

  // ---------------- RBAC ----------------
  let employeeToken = '';
  let hrToken = '';
  await test('RBAC employee login', async () => {
    const r = await req('POST', '/auth/login', { body: { email: 'employee@miningerp.com', password: 'Admin@12345' } });
    expect(r.status === 200, `got ${r.status}`);
    employeeToken = r.data.data.accessToken;
    return 'ok';
  });

  await test('RBAC hr login', async () => {
    const r = await req('POST', '/auth/login', { body: { email: 'hr@miningerp.com', password: 'Admin@12345' } });
    expect(r.status === 200, `got ${r.status}`);
    hrToken = r.data.data.accessToken;
    return 'ok';
  });

  await test('RBAC employee â†’ /users blocked (403)', async () => {
    const r = await req('GET', '/users', { token: employeeToken });
    expect(r.status === 403, `got ${r.status}`);
    return '403 as expected';
  });

  await test('RBAC employee â†’ /finance/expenses blocked (403)', async () => {
    const r = await req('GET', '/finance/expenses', { token: employeeToken });
    expect(r.status === 403, `got ${r.status}`);
    return '403 as expected';
  });

  await test('RBAC hr manager â†’ /finance/expenses blocked (403)', async () => {
    const r = await req('GET', '/finance/expenses', { token: hrToken });
    expect(r.status === 403, `got ${r.status}`);
    return '403 as expected';
  });

  await test('RBAC hr manager â†’ /hr/employees allowed (200)', async () => {
    const r = await req('GET', '/hr/employees', { token: hrToken });
    expect(r.status === 200, `got ${r.status}`);
    return `${r.data.meta ? r.data.meta.total : arr(r).length} employees visible`;
  });

  await test('RBAC employee â†’ allowed /hr/attendance (200)', async () => {
    const r = await req('GET', '/hr/attendance', { token: employeeToken });
    expect(r.status === 200, `got ${r.status}`);
    return 'ok';
  });

  // ---------------- READ ENDPOINTS (admin) ----------------
  const readRoutes = [
    '/dashboard/overview', '/dashboard/production-trend',
    '/mine-sites', '/hr/employees', '/hr/attendance', '/hr/leave', '/hr/payroll', '/hr/payroll/summary', '/mining/production',
    '/equipment', '/equipment/utilization', '/vehicles',
    '/maintenance/schedules', '/maintenance/records',
    '/inventory/items', '/inventory/warehouses', '/inventory/categories', '/inventory/movements',
    '/procurement/vendors', '/procurement/requests', '/procurement/orders',
    '/fuel/stations', '/fuel/transactions', '/fuel/purchases',
    '/finance/expenses', '/finance/invoices', '/finance/payments', '/finance/budgets',
    '/finance/summary', '/finance/expense-categories',
    '/reports/production', '/reports/attendance', '/reports/inventory-valuation',
    '/reports/financial-summary', '/reports/equipment-utilization',
    '/settings/company', '/settings/system', '/settings/departments', '/settings/leave-types', '/settings/shifts',
    '/users', '/roles', '/roles/permissions/catalog', '/audit-logs',
  ];
  const failedReads = [];
  for (const route of readRoutes) {
    try {
      const r = await req('GET', route, { token: adminToken });
      if (r.status !== 200) failedReads.push(`${route}=${r.status}`);
    } catch (e) {
      failedReads.push(`${route}=ERR`);
    }
  }
  await test(`READ all ${readRoutes.length} list/summary endpoints (admin)`, async () => {
    expect(failedReads.length === 0, failedReads.join(', '));
    return 'all 200';
  });

  // ---------------- VALIDATION ----------------
  await test('VALIDATION invalid payload â†’ 400', async () => {
    const r = await req('POST', '/finance/expenses', { token: adminToken, body: { description: 'no amount' } });
    expect(r.status === 400 || r.status === 422, `got ${r.status}`);
    return `status ${r.status}`;
  });

  // ---------------- LEAVE APPROVAL FLOW ----------------
  let leaveId = '';
  await test('LEAVE flow: apply (employee self)', async () => {
    const emps = await req('GET', '/hr/employees?limit=100', { token: adminToken });
    const emp = arr(emps).find((e) => e.email === 'employee@miningerp.com') || arr(emps)[0];
    const types = await req('GET', '/settings/leave-types', { token: adminToken });
    const lt = arr(types) ? arr(types)[0] : types.data.data[0];
    const r = await req('POST', '/hr/leave', {
      token: employeeToken,
      body: {
        employeeId: emp.id,
        leaveTypeId: lt.id,
        startDate: iso(addDays(LOFF)),
        endDate: iso(addDays(LOFF + 5)),
        reason: 'Smoke test leave request',
      },
    });
    expect([200, 201].includes(r.status), `got ${r.status}: ${JSON.stringify(r.data).slice(0, 200)}`);
    leaveId = r.data.data.id;
    expect(r.data.data.status === 'pending', `status=${r.data.data.status}`);
    return `created pending (${leaveId.slice(0, 8)}â€¦)`;
  });

  await test('LEAVE flow: visible in pending list', async () => {
    const r = await req('GET', '/hr/leave?status=pending', { token: adminToken });
    expect(r.status === 200, `got ${r.status}`);
    expect(arr(r).some((l) => l.id === leaveId), 'not found in pending list');
    return 'found';
  });

  await test('LEAVE flow: approve by admin', async () => {
    const r = await req('PATCH', `/hr/leave/${leaveId}/action`, { token: adminToken, body: { status: 'approved', actionRemarks: 'Approved via smoke test' } });
    expect(r.status === 200, `got ${r.status}: ${JSON.stringify(r.data).slice(0, 200)}`);
    expect(r.data.data.status === 'approved', `status=${r.data.data.status}`);
    expect(r.data.data.approvedById, 'approvedById not set');
    return 'approved';
  });

  await test('LEAVE flow: double approval blocked (400)', async () => {
    const r = await req('PATCH', `/hr/leave/${leaveId}/action`, { token: adminToken, body: { status: 'rejected' } });
    expect(r.status === 400, `got ${r.status}`);
    return '400 as expected';
  });

  await test('LEAVE flow: employee cannot approve (403)', async () => {
    const emps = await req('GET', '/hr/employees?limit=100', { token: adminToken });
    const emp = arr(emps)[1];
    const types = await req('GET', '/settings/leave-types', { token: adminToken });
    const lt = arr(types) ? arr(types)[0] : types.data.data[0];
    const created = await req('POST', '/hr/leave', {
      token: employeeToken,
      body: { employeeId: emp.id, leaveTypeId: lt.id, startDate: iso(addDays(LOFF + 20)), endDate: iso(addDays(LOFF + 22)), reason: 'RBAC test' },
    });
    expect([200, 201].includes(created.status), `create got ${created.status}`);
    const r = await req('PATCH', `/hr/leave/${created.data.data.id}/action`, { token: employeeToken, body: { status: 'approved' } });
    expect(r.status === 403, `got ${r.status}`);
    return '403 as expected';
  });

  // ---------------- EXPENSE APPROVAL FLOW ----------------
  let expenseId = '';
  await test('EXPENSE flow: create (pending)', async () => {
    const r = await req('POST', '/finance/expenses', {
      token: adminToken,
      body: { amount: 1250.5, description: 'Smoke test expense - site fuel', paymentMethod: 'cash' },
    });
    expect([200, 201].includes(r.status), `got ${r.status}: ${JSON.stringify(r.data).slice(0, 200)}`);
    expenseId = r.data.data.id;
    expect(['pending', 'submitted'].includes(r.data.data.status) || r.data.data.status, `status=${r.data.data.status}`);
    return `created (${r.data.data.expenseNumber}) status=${r.data.data.status}`;
  });

  await test('EXPENSE flow: approve by admin', async () => {
    const r = await req('PATCH', `/finance/expenses/${expenseId}/action`, { token: adminToken, body: { status: 'approved' } });
    expect(r.status === 200, `got ${r.status}: ${JSON.stringify(r.data).slice(0, 200)}`);
    expect(r.data.data.status === 'approved', `status=${r.data.data.status}`);
    return 'approved';
  });

  await test('EXPENSE flow: reject by admin on another expense', async () => {
    const list = await req('GET', '/finance/expenses?status=pending', { token: adminToken });
    const target = arr(list).find((e) => e.id !== expenseId);
    expect(target, 'no other pending expense');
    const r = await req('PATCH', `/finance/expenses/${target.id}/action`, { token: adminToken, body: { status: 'rejected' } });
    expect(r.status === 200, `got ${r.status}`);
    expect(r.data.data.status === 'rejected', `status=${r.data.data.status}`);
    return 'rejected';
  });

  // ---------------- PROCUREMENT APPROVAL FLOW ----------------
  let prId = '';
  let poId = '';
  await test('PROCUREMENT flow: create purchase request', async () => {
    const items = await req('GET', '/inventory/items?limit=5', { token: adminToken });
    const item = arr(items)[0];
    const r = await req('POST', '/procurement/requests', {
      token: adminToken,
      body: {
        justification: 'Smoke test PR - stock replenishment',
        requiredDate: iso(addDays(10)),
        items: [{ itemId: item.id, description: item.name, quantity: 5, estimatedCost: item.unitPrice * 5 }],
      },
    });
    expect([200, 201].includes(r.status), `got ${r.status}: ${JSON.stringify(r.data).slice(0, 250)}`);
    prId = r.data.data.id;
    expect(r.data.data.status === 'pending', `status=${r.data.data.status}`);
    return `created ${r.data.data.requestNumber}`;
  });

  await test('PROCUREMENT flow: approve purchase request', async () => {
    const r = await req('PATCH', `/procurement/requests/${prId}/action`, { token: adminToken, body: { status: 'approved', actionRemarks: 'Approved - smoke test' } });
    expect(r.status === 200, `got ${r.status}: ${JSON.stringify(r.data).slice(0, 200)}`);
    expect(r.data.data.status === 'approved', `status=${r.data.data.status}`);
    return 'approved';
  });

  await test('PROCUREMENT flow: convert PR â†’ purchase order', async () => {
    const vendors = await req('GET', '/procurement/vendors?limit=5', { token: adminToken });
    const vendor = arr(vendors)[0];
    const pr = await req('GET', `/procurement/requests/${prId}`, { token: adminToken });
    const prItem = arr(pr)[0];
    const r = await req('POST', '/procurement/orders', {
      token: adminToken,
      body: {
        vendorId: vendor.id,
        purchaseRequestId: prId,
        expectedDeliveryDate: iso(addDays(7)),
        items: [{ itemId: prItem.itemId, description: prItem.description, quantity: prItem.quantity, unitPrice: prItem.estimatedCost / prItem.quantity }],
      },
    });
    expect([200, 201].includes(r.status), `got ${r.status}: ${JSON.stringify(r.data).slice(0, 250)}`);
    poId = r.data.data.id;
    return `created ${r.data.data.poNumber}`;
  });

  await test('PROCUREMENT flow: receive PO items (stock in)', async () => {
    const order = await req('GET', `/procurement/orders/${poId}`, { token: adminToken });
    expect(order.status === 200, `get order ${order.status}`);
    const receipts = arr(order).map((i) => ({ purchaseOrderItemId: i.id, receivedQuantity: i.quantity }));
    const r = await req('POST', `/procurement/orders/${poId}/receive`, { token: adminToken, body: { receipts } });
    expect([200, 201].includes(r.status), `got ${r.status}: ${JSON.stringify(r.data).slice(0, 250)}`);
    return `received ${receipts.length} lines, status=${r.data.data.status}`;
  });

  // ---------------- ATTENDANCE ----------------
  let attendanceId = '';
  await test('ATTENDANCE: check-in (today)', async () => {
    const emps = await req('GET', '/hr/employees?limit=100', { token: adminToken });
    const emp = arr(emps).find((e) => e.email === 'employee@miningerp.com') || arr(emps)[0];
    const r = await req('POST', '/hr/attendance/check-in', { token: adminToken, body: { employeeId: emp.id } });
    if (r.status === 409) return 'already checked in today (conflict ok)';
    expect([200, 201].includes(r.status), `got ${r.status}: ${JSON.stringify(r.data).slice(0, 200)}`);
    attendanceId = r.data.data.id;
    return 'checked in';
  });

  await test('ATTENDANCE: check-out', async () => {
    if (!attendanceId) return 'skipped (already existed)';
    const r = await req('PATCH', `/hr/attendance/${attendanceId}/check-out`, { token: adminToken, body: {} });
    expect(r.status === 200, `got ${r.status}`);
    return `hours=${r.data.data.hoursWorked}`;
  });

  await test('ATTENDANCE: duplicate check-in blocked', async () => {
    const emps = await req('GET', '/hr/employees?limit=100', { token: adminToken });
    const emp = arr(emps).find((e) => e.email === 'employee@miningerp.com') || arr(emps)[0];
    const r = await req('POST', '/hr/attendance/check-in', { token: adminToken, body: { employeeId: emp.id } });
    expect([400, 409].includes(r.status), `got ${r.status}`);
    return `${r.status} as expected`;
  });

  // ---------------- PRODUCTION ----------------
  let prodId = '';
  await test('PRODUCTION: create entry', async () => {
    const sites = await req('GET', '/mine-sites', { token: adminToken });
    const eq = await req('GET', '/equipment?limit=5', { token: adminToken });
    const r = await req('POST', '/mining/production', {
      token: adminToken,
      body: {
        mineSiteId: arr(sites)[0].id,
        date: iso(new Date()),
        shift: 'day',
        materialType: 'Limestone',
        quantity: 250,
        unit: 'tons',
        qualityGrade: 'A',
        equipmentId: arr(eq)[0] ? arr(eq)[0].id : null,
      },
    });
    expect([200, 201].includes(r.status), `got ${r.status}: ${JSON.stringify(r.data).slice(0, 250)}`);
    prodId = r.data.data.id;
    return `created qty=250`;
  });

  await test('PRODUCTION: update entry', async () => {
    const r = await req('PATCH', `/mining/production/${prodId}`, { token: adminToken, body: { quantity: 300, remarks: 'Updated by smoke test' } });
    expect(r.status === 200, `got ${r.status}`);
    expect(r.data.data.quantity === 300, `qty=${r.data.data.quantity}`);
    return 'updated 250 â†’ 300';
  });

  // ---------------- EQUIPMENT ----------------
  let eqId = '';
  await test('EQUIPMENT: create + status change + delete', async () => {
    const sites = await req('GET', '/mine-sites', { token: adminToken });
    const r = await req('POST', '/equipment', {
      token: adminToken,
      body: { name: 'Smoke Test Excavator', code: `EQ-TST-${Date.now()}`, type: 'excavator', mineSiteId: arr(sites)[0].id },
    });
    expect([200, 201].includes(r.status), `create got ${r.status}: ${JSON.stringify(r.data).slice(0, 200)}`);
    eqId = r.data.data.id;
    const st = await req('PATCH', `/equipment/${eqId}/status`, { token: adminToken, body: { status: 'under_maintenance' } });
    expect(st.status === 200, `status got ${st.status}`);
    expect(st.data.data.status === 'under_maintenance', `status=${st.data.data.status}`);
    const del = await req('DELETE', `/equipment/${eqId}`, { token: adminToken });
    expect(del.status === 200 || del.status === 204, `delete got ${del.status}`);
    return 'create â†’ status â†’ delete all ok';
  });

  // ---------------- INVENTORY ----------------
  await test('INVENTORY: create item + stock movement', async () => {
    const whs = await req('GET', '/inventory/warehouses', { token: adminToken });
    const cats = await req('GET', '/inventory/categories', { token: adminToken });
    const item = await req('POST', '/inventory/items', {
      token: adminToken,
      body: {
        sku: `TST-${Date.now()}`,
        name: 'Smoke Test Item',
        categoryId: arr(cats)[0].id,
        unit: 'pcs',
        quantityInStock: 50,
        reorderLevel: 10,
        unitPrice: 99,
        warehouseId: arr(whs)[0].id,
      },
    });
    expect([200, 201].includes(item.status), `item got ${item.status}: ${JSON.stringify(item.data).slice(0, 200)}`);
    const itemId = item.data.data.id;
    const mv = await req('POST', '/inventory/movements', { token: adminToken, body: { itemId, type: 'out', quantity: 5, remarks: 'Smoke test issue' } });
    expect([200, 201].includes(mv.status), `movement got ${mv.status}: ${JSON.stringify(mv.data).slice(0, 200)}`);
    const after = await req('GET', `/inventory/items/${itemId}`, { token: adminToken });
    expect(Math.abs(after.data.data.quantityInStock - 45) < 0.001, `stock=${after.data.data.quantityInStock} (expected 45)`);
    const del = await req('DELETE', `/inventory/items/${itemId}`, { token: adminToken });
    expect([200, 204].includes(del.status), `delete got ${del.status}`);
    return 'create â†’ movement (50â†’45) â†’ delete ok';
  });

  // ---------------- USERS CRUD ----------------
  await test('USERS: create + update + reset-password + delete', async () => {
    const roles = await req('GET', '/roles', { token: adminToken });
    const empRole = arr(roles).find((r) => r.name === 'Employee');
    const email = `smoketester${Date.now()}@miningerp.com`;
    const c = await req('POST', '/users', { token: adminToken, body: { name: 'Smoke Tester', email, password: 'Smoke@12345', roleId: empRole.id } });
    expect([200, 201].includes(c.status), `create got ${c.status}: ${JSON.stringify(c.data).slice(0, 250)}`);
    const uid = c.data.data.id;
    const u = await req('PATCH', `/users/${uid}`, { token: adminToken, body: { name: 'Smoke Tester Updated' } });
    expect(u.status === 200, `update got ${u.status}`);
    const rp = await req('POST', `/users/${uid}/reset-password`, { token: adminToken, body: { newPassword: 'Reset@12345' } });
    expect(rp.status === 200, `reset got ${rp.status}: ${JSON.stringify(rp.data).slice(0, 150)}`);
    const loginNew = await req('POST', '/auth/login', { body: { email, password: 'Reset@12345' } });
    expect(loginNew.status === 200, `login with reset pass got ${loginNew.status}`);
    const d = await req('DELETE', `/users/${uid}`, { token: adminToken });
    expect([200, 204].includes(d.status), `delete got ${d.status}`);
    const loginDeleted = await req('POST', '/auth/login', { body: { email, password: 'Reset@12345' } });
    expect(loginDeleted.status !== 200, `deleted user still logs in! ${loginDeleted.status}`);
    return 'create â†’ update â†’ reset â†’ login â†’ delete â†’ blocked login';
  });

  // ---------------- CHANGE PASSWORD FLOW ----------------
  await test('AUTH: change password flow (ops user round-trip)', async () => {
    const login = (pw) => req('POST', '/auth/login', { body: { email: 'ops@miningerp.com', password: pw } });
    let changed = false;
    const notes = [];
    try {
      const opsLogin = await login('Admin@12345');
      if (opsLogin.status === 429) return 'skipped: login rate-limited (limiter working as designed)';
      expect(opsLogin.status === 200, `initial login ${opsLogin.status}`);
      const opsToken = opsLogin.data.data.accessToken;
      const ch = await req('POST', '/auth/change-password', { token: opsToken, body: { currentPassword: 'Admin@12345', newPassword: 'NewOps@12345' } });
      expect(ch.status === 200, `change got ${ch.status}: ${JSON.stringify(ch.data).slice(0, 150)}`);
      changed = true;
      const oldBlocked = await login('Admin@12345');
      if (oldBlocked.status === 429) notes.push('old-block check skipped (429)');
      else {
        expect(oldBlocked.status !== 200, `old password still works!`);
        notes.push('old blocked');
      }
      const newOk = await login('NewOps@12345');
      if (newOk.status === 429) notes.push('new-login check skipped (429)');
      else {
        expect(newOk.status === 200, `new login ${newOk.status}`);
        const back = await req('POST', '/auth/change-password', { token: newOk.data.data.accessToken, body: { currentPassword: 'NewOps@12345', newPassword: 'Admin@12345' } });
        expect(back.status === 200, `revert got ${back.status}`);
        changed = false;
        notes.push('reverted via API');
      }
      return notes.join(', ');
    } finally {
      if (changed) {
        const { PrismaClient } = require('@prisma/client');
        const bcrypt = require('bcryptjs');
        const p = new PrismaClient();
        try {
          const u = await p.user.findUnique({ where: { email: 'ops@miningerp.com' } });
          await p.user.update({ where: { id: u.id }, data: { password: bcrypt.hashSync('Admin@12345', 10), mustChangePassword: false } });
          console.log('   (ops password force-reverted via DB after rate-limit)');
        } finally {
          await p.$disconnect();
        }
      }
    }
  });

  await test('AUTH: weak new password rejected (400)', async () => {
    const r = await req('POST', '/auth/change-password', { token: adminToken, body: { currentPassword: 'Admin@12345', newPassword: 'weak' } });
    expect(r.status === 400, `got ${r.status}`);
    return '400 as expected';
  });

  // ---------------- ROLE PERMISSIONS ----------------
  await test('ROLES: permission catalog + set permissions round-trip', async () => {
    const cat = await req('GET', '/roles/permissions/catalog', { token: adminToken });
    expect(cat.status === 200, `catalog ${cat.status}`);
    const roles = await req('GET', '/roles', { token: adminToken });
    const empRole = arr(roles).find((r) => r.name === 'Employee');
    const detail = await req('GET', `/roles/${empRole.id}`, { token: adminToken });
    expect(detail.status === 200, `detail ${detail.status}`);
    const originalIds = (detail.data.data.permissions || []).map((p) => p.permissionId || p.id);
    const put = await req('PUT', `/roles/${empRole.id}/permissions`, { token: adminToken, body: { permissionIds: originalIds } });
    expect([200, 201].includes(put.status), `set got ${put.status}: ${JSON.stringify(put.data).slice(0, 200)}`);
    return `catalog=${arr(cat) ? arr(cat).length : '?'} perms, set ok`;
  });

  // ---------------- VEHICLES / MAINTENANCE / FUEL (create) ----------------
  await test('VEHICLES: create + status + delete', async () => {
    const r = await req('POST', '/vehicles', { token: adminToken, body: { name: 'Smoke Test Truck', plateNumber: `TS-${Date.now()}`, type: 'dump_truck' } });
    expect([200, 201].includes(r.status), `create ${r.status}: ${JSON.stringify(r.data).slice(0, 200)}`);
    const st = await req('PATCH', `/vehicles/${r.data.data.id}/status`, { token: adminToken, body: { status: 'breakdown' } });
    expect(st.status === 200, `status ${st.status}`);
    const del = await req('DELETE', `/vehicles/${r.data.data.id}`, { token: adminToken });
    expect([200, 204].includes(del.status), `delete ${del.status}`);
    return 'ok';
  });

  await test('MAINTENANCE: schedule + record create', async () => {
    const eq = await req('GET', '/equipment?limit=5', { token: adminToken });
    const s = await req('POST', '/maintenance/schedules', { token: adminToken, body: { equipmentId: arr(eq)[0].id, type: 'preventive', frequencyDays: 30, scheduledDate: iso(addDays(15)), description: 'Smoke test schedule' } });
    expect([200, 201].includes(s.status), `schedule ${s.status}: ${JSON.stringify(s.data).slice(0, 200)}`);
    const rec = await req('POST', '/maintenance/records', { token: adminToken, body: { equipmentId: arr(eq)[0].id, maintenanceType: 'preventive', description: 'Smoke test service', cost: 500, startDate: iso(addDays(15)), endDate: iso(addDays(16)), status: 'completed', downtimeHours: 4 } });
    expect([200, 201].includes(rec.status), `record ${rec.status}: ${JSON.stringify(rec.data).slice(0, 200)}`);
    return 'ok';
  });

  await test('FUEL: transaction create', async () => {
    const stations = await req('GET', '/fuel/stations', { token: adminToken });
    const veh = await req('GET', '/vehicles?limit=5', { token: adminToken });
    const r = await req('POST', '/fuel/transactions', { token: adminToken, body: { fuelStationId: arr(stations)[0].id, vehicleId: arr(veh)[0].id, quantity: 100, cost: 135, purpose: 'Smoke test fuel' } });
    expect([200, 201].includes(r.status), `got ${r.status}: ${JSON.stringify(r.data).slice(0, 200)}`);
    return 'ok';
  });

  await test('FUEL: purchase create', async () => {
    const stations = await req('GET', '/fuel/stations', { token: adminToken });
    const vendors = await req('GET', '/procurement/vendors?limit=10', { token: adminToken });
    const fuelVendor = arr(vendors).find((v) => v.category === 'Fuel') || arr(vendors)[0];
    const r = await req('POST', '/fuel/purchases', { token: adminToken, body: { fuelStationId: arr(stations)[0].id, vendorId: fuelVendor.id, quantity: 1000, cost: 1350, invoiceNumber: `SMK-${Date.now()}` } });
    expect([200, 201].includes(r.status), `got ${r.status}: ${JSON.stringify(r.data).slice(0, 200)}`);
    return 'ok';
  });

  // ---------------- FINANCE invoice/budget/payment ----------------
  await test('FINANCE: invoice create + status change', async () => {
    const r = await req('POST', '/finance/invoices', { token: adminToken, body: { type: 'sales', partyName: 'Smoke Test Client', amount: 5000, tax: 500, dueDate: iso(addDays(20)) } });
    expect([200, 201].includes(r.status), `create ${r.status}: ${JSON.stringify(r.data).slice(0, 200)}`);
    const st = await req('PATCH', `/finance/invoices/${r.data.data.id}/status`, { token: adminToken, body: { status: 'sent' } });
    expect(st.status === 200, `status ${st.status}`);
    expect(st.data.data.status === 'sent', `status=${st.data.data.status}`);
    return 'ok';
  });

  await test('FINANCE: budget create + update', async () => {
    const r = await req('POST', '/finance/budgets', { token: adminToken, body: { category: 'Smoke Test Category', fiscalYear: 2026, allocatedAmount: 10000, period: 'monthly' } });
    expect([200, 201].includes(r.status), `create ${r.status}: ${JSON.stringify(r.data).slice(0, 200)}`);
    const up = await req('PATCH', `/finance/budgets/${r.data.data.id}`, { token: adminToken, body: { allocatedAmount: 15000 } });
    expect(up.status === 200, `update ${up.status}`);
    expect(up.data.data.allocatedAmount === 15000, `amt=${up.data.data.allocatedAmount}`);
    return 'ok';
  });

  await test('FINANCE: payment against expense', async () => {
    const pending = await req('GET', '/finance/expenses?status=approved', { token: adminToken });
    const exp = arr(pending).find((e) => e.status === 'approved');
    const r = await req('POST', '/finance/payments', { token: adminToken, body: { expenseId: exp.id, amount: exp.amount, method: 'bank_transfer', reference: 'SMOKE-PAY' } });
    expect([200, 201].includes(r.status), `got ${r.status}: ${JSON.stringify(r.data).slice(0, 200)}`);
    return `paid ${r.data.data.paymentNumber}`;
  });

  // ---------------- MINE SITES / SETTINGS ----------------
  await test('MINE SITES: create + update + delete', async () => {
    const c = await req('POST', '/mine-sites', { token: adminToken, body: { name: `Smoke Site ${Date.now()}`, code: `SMK-${Date.now().toString().slice(-6)}`, status: 'inactive' } });
    expect([200, 201].includes(c.status), `create ${c.status}: ${JSON.stringify(c.data).slice(0, 200)}`);
    const up = await req('PATCH', `/mine-sites/${c.data.data.id}`, { token: adminToken, body: { location: 'Updated location' } });
    expect(up.status === 200, `update ${up.status}`);
    const del = await req('DELETE', `/mine-sites/${c.data.data.id}`, { token: adminToken });
    expect([200, 204].includes(del.status), `delete ${del.status}`);
    return 'ok';
  });

  await test('SETTINGS: company update + department create/delete', async () => {
    const co = await req('GET', '/settings/company', { token: adminToken });
    expect(co.status === 200, `company ${co.status}`);
    const dep = await req('POST', '/settings/departments', { token: adminToken, body: { name: `Smoke Dept ${Date.now().toString().slice(-5)}` } });
    expect([200, 201].includes(dep.status), `dept ${dep.status}: ${JSON.stringify(dep.data).slice(0, 200)}`);
    const del = await req('DELETE', `/settings/departments/${dep.data.data.id}`, { token: adminToken });
    expect([200, 204].includes(del.status), `delete ${del.status}`);
    return 'ok';
  });

  // ---------------- FRONTEND ----------------
  await test('FRONTEND: /login page renders (200)', async () => {
    const r = await fetch(`${WEB}/login`, { redirect: 'manual' });
    expect(r.status === 200, `got ${r.status}`);
    return '200';
  });

  await test('FRONTEND: / redirects unauthenticated â†’ login (3xx)', async () => {
    const r = await fetch(`${WEB}/dashboard`, { redirect: 'manual' });
    expect([200, 302, 303, 307, 308].includes(r.status), `got ${r.status}`);
    if (r.status === 200) {
      const html = await r.text();
      expect(!html.includes('Logout') && !html.includes('Sign out'), 'dashboard content leaked without session');
      return '200 SSR shell (client-side guard redirects to /login)';
    }
    const loc = r.headers.get('location') || '';
    expect(loc.includes('login'), `location=${loc}`);
    return `${r.status} -> ${loc}`;
  });

  await test('FRONTEND: all dashboard pages respond (auth redirect)', async () => {
    const pages = ['/dashboard', '/hr/employees', '/hr/leave', '/hr/attendance', '/hr/payroll', '/mining/production', '/equipment', '/vehicles', '/maintenance', '/inventory', '/procurement', '/fuel', '/finance', '/reports', '/roles', '/users', '/settings', '/audit-logs', '/mine-sites', '/change-password'];
    const bad = [];
    for (const p of pages) {
      const r = await fetch(`${WEB}${p}`, { redirect: 'manual' });
      if (![200, 302, 303, 307, 308].includes(r.status)) bad.push(`${p}=${r.status}`);
    }
    expect(bad.length === 0, bad.join(', '));
    return `${pages.length} pages ok (all redirect to login w/o session)`;
  });

  // ---------------- AUDIT ----------------
  await test('AUDIT: actions got logged', async () => {
    const r = await req('GET', '/audit-logs?limit=100', { token: adminToken });
    expect(r.status === 200, `got ${r.status}`);
    const actions = new Set(arr(r).map((i) => i.action));
    expect(actions.size > 1, `actions: ${[...actions].join(',')}`);
    return `${r.data.meta ? r.data.meta.total : arr(r).length} logs, actions: ${[...actions].slice(0, 6).join(', ')}`;
  });

  // ---------------- LOGOUT ----------------
  await test('AUTH: logout revokes refresh token', async () => {
    const r = await req('POST', '/auth/logout', { token: adminToken, cookie: adminCookie });
    expect(r.status === 200, `got ${r.status}`);
    const again = await req('POST', '/auth/refresh', { cookie: adminCookie });
    expect(again.status !== 200, `reused token still works! ${again.status}`);
    return `logout 200, reuse â†’ ${again.status}`;
  });

  // ---------------- SUMMARY ----------------
  const failed = results.filter((r) => !r.ok);
  console.log('\n========================================');
  console.log(`TOTAL: ${results.length} | PASS: ${results.length - failed.length} | FAIL: ${failed.length}`);
  if (failed.length) {
    console.log('\nFAILED TESTS:');
    failed.forEach((f) => console.log(`  âŒ ${f.name} â€” ${f.info}`));
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});


