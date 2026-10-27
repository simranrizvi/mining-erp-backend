/* eslint-disable no-console */
const BASE = process.env.API_BASE || 'http://localhost:5000/api/v1';

const results = [];
let adminToken = '';
let hrToken = '';

function log(name, ok, info = '') {
  results.push({ name, ok, info });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${info ? ` — ${info}` : ''}`);
}

async function req(method, path, { token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}

async function test(name, fn) {
  try {
    const info = await fn();
    log(name, true, typeof info === 'string' ? info : '');
  } catch (e) {
    log(name, false, e.message);
  }
}

function expect(cond, msg) { if (!cond) throw new Error(msg); }
function arr(r) { const d = r.data ? r.data.data : r; return Array.isArray(d) ? d : d && d.items ? d.items : []; }
function addDays(n) { const d = new Date(); d.setDate(d.getDate() + n); return d; }
const iso = (d) => d.toISOString();

async function main() {
  await test('HR login (hr@miningerp.com)', async () => {
    const r = await req('POST', '/auth/login', { body: { email: 'hr@miningerp.com', password: 'Admin@12345' } });
    expect(r.status === 200, `got ${r.status}`);
    hrToken = r.data.data.accessToken;
    return 'ok';
  });

  await test('ADMIN login', async () => {
    const r = await req('POST', '/auth/login', { body: { email: 'admin@miningerp.com', password: 'Admin@12345' } });
    expect(r.status === 200, `got ${r.status}`);
    adminToken = r.data.data.accessToken;
    return 'ok';
  });

  // ---- EMPLOYEE MASTER (frontend: useResource('/hr/employees')) ----
  let newEmpId = '';
  let newEmpEmail = `hrflow.${Date.now()}@miningerp.com`;
  let newUserId = '';
  let tempPassword = '';

  await test('HR: create employee WITH login account (createLoginAccount)', async () => {
    const roles = await req('GET', '/roles', { token: adminToken });
    const empRole = arr(roles).find((r) => r.name === 'Employee');
    const sites = await req('GET', '/mine-sites', { token: adminToken });
    const depts = await req('GET', '/settings/departments', { token: adminToken });
    const r = await req('POST', '/hr/employees', {
      token: hrToken,
      body: {
        firstName: 'HrFlow', lastName: 'Tester', email: newEmpEmail, phone: '+1-555-9999',
        gender: 'female', departmentId: arr(depts)[0].id, designation: 'Test Analyst',
        mineSiteId: arr(sites)[0].id, employmentType: 'full_time', basicSalary: 5000,
        createLoginAccount: true, roleId: empRole.id,
      },
    });
    expect([200, 201].includes(r.status), `got ${r.status}: ${JSON.stringify(r.data).slice(0, 250)}`);
    newEmpId = r.data.data.id;
    expect(r.data.data.employeeCode, 'no employeeCode');
    expect(r.data.data.userId, 'no linked user account');
    newUserId = r.data.data.userId;
    expect(r.data.data.tempPassword && String(r.data.data.tempPassword).startsWith('Mine@'), 'tempPassword not returned on create');
    tempPassword = r.data.data.tempPassword;
    return `${r.data.data.employeeCode}, user linked, temp password returned`;
  });

  await test('HR: temp password usable for first login (flow usability)', async () => {
    expect(tempPassword, 'temp password never captured');
    const login = await req('POST', '/auth/login', { body: { email: newEmpEmail, password: tempPassword } });
    expect(login.status === 200, `temp-password login got ${login.status}`);
    expect(login.data.data.user.mustChangePassword === true, 'mustChangePassword not set on temp login');
    return 'temp password works, mustChangePassword=true';
  });

  await test('ADMIN: linked user account exists for new employee', async () => {
    const r = await req('GET', `/users?search=${encodeURIComponent(newEmpEmail)}`, { token: adminToken });
    expect(r.status === 200, `got ${r.status}`);
    const u = arr(r).find((x) => x.email === newEmpEmail);
    expect(u, 'user not created');
    expect(u.isActive, 'user inactive');
    return `user active, role=${u.role ? u.role.name : u.roleName}`;
  });

  await test('HR: update employee (designation / salary / status)', async () => {
    const r = await req('PATCH', `/hr/employees/${newEmpId}`, { token: hrToken, body: { designation: 'Senior Test Analyst', basicSalary: 6500, status: 'active' } });
    expect(r.status === 200, `got ${r.status}`);
    expect(r.data.data.designation === 'Senior Test Analyst', `designation=${r.data.data.designation}`);
    expect(r.data.data.basicSalary === 6500, `salary=${r.data.data.basicSalary}`);
    return 'ok';
  });

  await test('HR: duplicate employee email blocked (409)', async () => {
    const r = await req('POST', '/hr/employees', { token: hrToken, body: { firstName: 'Dup', lastName: 'Test', email: newEmpEmail } });
    expect(r.status === 409, `got ${r.status}`);
    return '409 as expected';
  });

  // ---- ATTENDANCE ----
  await test('HR: attendance summary (frontend stat cards)', async () => {
    const r = await req('GET', '/hr/attendance/summary', { token: hrToken });
    expect(r.status === 200, `got ${r.status}`);
    const s = r.data.data;
    expect(s && typeof s === 'object', 'empty summary');
    return JSON.stringify(s).slice(0, 120);
  });

  await test('HR: attendance list with ?date filter (frontend default query)', async () => {
    const d = new Date().toISOString().slice(0, 10);
    const r = await req('GET', `/hr/attendance?date=${d}&page=1&limit=10`, { token: hrToken });
    expect(r.status === 200, `got ${r.status}`);
    return `${arr(r).length} rows for ${d}`;
  });

  await test('HR: check-in new employee → check-out with 8h span', async () => {
    const r = await req('POST', '/hr/attendance/check-in', { token: hrToken, body: { employeeId: newEmpId } });
    expect([200, 201].includes(r.status), `check-in got ${r.status}: ${JSON.stringify(r.data).slice(0, 200)}`);
    const rec = r.data.data;
    const out = new Date(new Date(rec.checkIn).getTime() + 8 * 3600 * 1000);
    const co = await req('PATCH', `/hr/attendance/${rec.id}/check-out`, { token: hrToken, body: { checkOut: iso(out) } });
    expect(co.status === 200, `check-out got ${co.status}`);
    const hours = co.data.data.hoursWorked;
    expect(hours >= 7.9 && hours <= 8.1, `hoursWorked=${hours} (expected ~8)`);
    return `hoursWorked=${hours}`;
  });

  await test('HR: bulk-mark attendance for tomorrow (upsert)', async () => {
    const emps = await req('GET', '/hr/employees?limit=5', { token: hrToken });
    const ids = arr(emps).slice(0, 2).map((e) => e.id);
    const date = iso(addDays(1));
    const r = await req('POST', '/hr/attendance/bulk-mark', {
      token: hrToken,
      body: { date, entries: ids.map((id) => ({ employeeId: id, status: 'present', remarks: 'Bulk marked' })) },
    });
    expect([200, 201].includes(r.status), `got ${r.status}: ${JSON.stringify(r.data).slice(0, 200)}`);
    const list = await req('GET', `/hr/attendance?date=${date.slice(0, 10)}&limit=50`, { token: hrToken });
    const found = arr(list).filter((a) => ids.includes(a.employeeId) && a.status === 'present');
    expect(found.length === 2, `expected 2 marked, got ${found.length}`);
    const again = await req('POST', '/hr/attendance/bulk-mark', {
      token: hrToken,
      body: { date, entries: [{ employeeId: ids[0], status: 'late' }] },
    });
    expect(again.status === 201 || again.status === 200, `re-run (upsert) got ${again.status}`);
    return '2 marked, upsert re-run ok';
  });

  // ---- LEAVE ----
  const LOFF = 700 + (Date.now() % 200);
  let leavePendingId = '';

  await test('HR: apply leave for employee (frontend Apply dialog)', async () => {
    const types = await req('GET', '/settings/leave-types', { token: hrToken });
    const r = await req('POST', '/hr/leave', {
      token: hrToken,
      body: { employeeId: newEmpId, leaveTypeId: arr(types)[0].id, startDate: addDays(LOFF).toISOString().slice(0, 10), endDate: addDays(LOFF + 3).toISOString().slice(0, 10), reason: 'HR flow test leave' },
    });
    expect([200, 201].includes(r.status), `got ${r.status}: ${JSON.stringify(r.data).slice(0, 200)}`);
    leavePendingId = r.data.data.id;
    expect(r.data.data.status === 'pending', `status=${r.data.data.status}`);
    return 'pending created';
  });

  await test('HR: approve leave (HR Manager has hr.leave:approve)', async () => {
    const r = await req('PATCH', `/hr/leave/${leavePendingId}/action`, { token: hrToken, body: { status: 'approved', actionRemarks: 'HR approved' } });
    expect(r.status === 200, `got ${r.status}: ${JSON.stringify(r.data).slice(0, 200)}`);
    expect(r.data.data.status === 'approved', `status=${r.data.data.status}`);
    return 'approved by HR';
  });

  await test('HR: cancel flow on pending leave', async () => {
    const types = await req('GET', '/settings/leave-types', { token: hrToken });
    const created = await req('POST', '/hr/leave', {
      token: hrToken,
      body: { employeeId: newEmpId, leaveTypeId: arr(types)[0].id, startDate: addDays(LOFF + 20).toISOString().slice(0, 10), endDate: addDays(LOFF + 21).toISOString().slice(0, 10), reason: 'to be cancelled' },
    });
    expect([200, 201].includes(created.status), `create got ${created.status}`);
    const c = await req('PATCH', `/hr/leave/${created.data.data.id}/cancel`, { token: hrToken });
    expect(c.status === 200, `cancel got ${c.status}: ${JSON.stringify(c.data).slice(0, 150)}`);
    expect(c.data.data.status === 'cancelled', `status=${c.data.data.status}`);
    const rec = await req('PATCH', `/hr/leave/${created.data.data.id}/action`, { token: hrToken, body: { status: 'approved' } });
    expect(rec.status === 400, `approve after cancel got ${rec.status} (expected 400)`);
    return 'cancelled; approve-after-cancel blocked';
  });

  await test('HR: overlap leave rejected (409)', async () => {
    const types = await req('GET', '/settings/leave-types', { token: hrToken });
    const r = await req('POST', '/hr/leave', {
      token: hrToken,
      body: { employeeId: newEmpId, leaveTypeId: arr(types)[0].id, startDate: addDays(LOFF + 1).toISOString().slice(0, 10), endDate: addDays(LOFF + 2).toISOString().slice(0, 10), reason: 'overlap' },
    });
    expect(r.status === 409, `got ${r.status}`);
    return '409 as expected';
  });

  // ---- SETTINGS (HR has settings:read/create) ----
  await test('HR: shift create + list (delete correctly denied without settings:delete)', async () => {
    const c = await req('POST', '/settings/shifts', { token: hrToken, body: { name: `Shift T${Date.now().toString().slice(-5)}`, startTime: '07:00', endTime: '15:00' } });
    expect([200, 201].includes(c.status), `create ${c.status}: ${JSON.stringify(c.data).slice(0, 150)}`);
    const list = await req('GET', '/settings/shifts', { token: hrToken });
    expect(list.status === 200, `list ${list.status}`);
    const dHr = await req('DELETE', `/settings/shifts/${c.data.data.id}`, { token: hrToken });
    expect(dHr.status === 403, `HR delete got ${dHr.status} (expected 403 — HR Manager lacks settings:delete)`);
    const dAdmin = await req('DELETE', `/settings/shifts/${c.data.data.id}`, { token: adminToken });
    expect([200, 204].includes(dAdmin.status), `admin delete ${dAdmin.status}`);
    return 'HR create/list ok, HR delete 403 (RBAC), admin cleanup ok';
  });

  await test('HR: leave-type create (delete correctly denied without settings:delete)', async () => {
    const c = await req('POST', '/settings/leave-types', { token: hrToken, body: { name: `LT T${Date.now().toString().slice(-5)}`, maxDaysPerYear: 3 } });
    expect([200, 201].includes(c.status), `create ${c.status}: ${JSON.stringify(c.data).slice(0, 150)}`);
    const dHr = await req('DELETE', `/settings/leave-types/${c.data.data.id}`, { token: hrToken });
    expect(dHr.status === 403, `HR delete got ${dHr.status} (expected 403 — HR Manager lacks settings:delete)`);
    const dAdmin = await req('DELETE', `/settings/leave-types/${c.data.data.id}`, { token: adminToken });
    expect([200, 204].includes(dAdmin.status), `admin delete ${dAdmin.status}`);
    return 'HR create ok, HR delete 403 (RBAC), admin cleanup ok';
  });

  // ---- REPORTS ----
  await test('HR: reports/attendance + production readable', async () => {
    const r1 = await req('GET', '/reports/attendance', { token: hrToken });
    expect(r1.status === 200, `attendance report ${r1.status}`);
    const r2 = await req('GET', '/reports/production', { token: hrToken });
    expect(r2.status === 200, `production report ${r2.status}`);
    return 'both 200';
  });

  // ---- RBAC BOUNDARIES for HR role ----
  await test('HR blocked outside HR scope (equipment create, users delete)', async () => {
    const e = await req('POST', '/equipment', { token: hrToken, body: { name: 'X', code: `X${Date.now()}`, type: 'drill' } });
    expect(e.status === 403, `equipment create got ${e.status}`);
    const u = await req('DELETE', '/users/some-id', { token: hrToken });
    expect(u.status === 403, `users delete got ${u.status}`);
    return '403 / 403';
  });

  await test('HR blocked from password reset of others (users:update)', async () => {
    const r = await req('POST', `/users/${newUserId}/reset-password`, { token: hrToken, body: { newPassword: 'Reset@12345' } });
    expect(r.status === 403, `got ${r.status}`);
    return '403 as expected';
  });

  // ---- NEW ACCOUNT ACCESS via admin reset (temp password not exposed) ----
  await test('ADMIN reset new-user password → login works', async () => {
    const rp = await req('POST', `/users/${newUserId}/reset-password`, { token: adminToken, body: { newPassword: 'HrFlow@12345' } });
    expect(rp.status === 200, `reset ${rp.status}: ${JSON.stringify(rp.data).slice(0, 150)}`);
    const login = await req('POST', '/auth/login', { body: { email: newEmpEmail, password: 'HrFlow@12345' } });
    expect(login.status === 200, `login ${login.status}`);
    expect(login.data.data.user.mustChangePassword === true, 'mustChangePassword not set after reset');
    return 'login ok, mustChangePassword=true';
  });

  // ---- DATA SCOPING (informational) ----
  await test('SCOPING: employee vs admin visibility of attendance/leave', async () => {
    const empLogin = await req('POST', '/auth/login', { body: { email: 'employee@miningerp.com', password: 'Admin@12345' } });
    expect(empLogin.status === 200, `emp login ${empLogin.status}`);
    const et = empLogin.data.data.accessToken;
    const a1 = await req('GET', '/hr/attendance?limit=1', { token: et });
    const a2 = await req('GET', '/hr/attendance?limit=1', { token: adminToken });
    const l1 = await req('GET', '/hr/leave?limit=1', { token: et });
    const l2 = await req('GET', '/hr/leave?limit=1', { token: adminToken });
    const t = (r) => (r.data.meta ? r.data.meta.total : '?');
    return `attendance visible: employee=${t(a1)} admin=${t(a2)} | leave: employee=${t(l1)} admin=${t(l2)} (NOT row-scoped to own record — by design?)`;
  });

  // ---- PAYROLL MODULE (API + UI new) ----
  let payrollId = '';

  await test('PAYROLL: list + summary readable (HR Manager hr.payroll:*)', async () => {
    const l = await req('GET', '/hr/payroll', { token: hrToken });
    expect(l.status === 200, `list ${l.status}: ${JSON.stringify(l.data).slice(0, 150)}`);
    const s = await req('GET', '/hr/payroll/summary', { token: hrToken });
    expect(s.status === 200, `summary ${s.status}`);
    expect(s.data.data && typeof s.data.data.totalRecords === 'number', 'summary missing totalRecords');
    return `records=${s.data.data.totalRecords}`;
  });

  await test('PAYROLL: create draft → net computed → duplicate blocked (409)', async () => {
    const body = { employeeId: newEmpId, month: 6, year: 2028, basicSalary: 6500, allowances: 500, deductions: 200, overtimePay: 100 };
    const c = await req('POST', '/hr/payroll', { token: hrToken, body });
    expect([200, 201].includes(c.status), `create ${c.status}: ${JSON.stringify(c.data).slice(0, 200)}`);
    payrollId = c.data.data.id;
    expect(c.data.data.status === 'draft', `status=${c.data.data.status}`);
    expect(c.data.data.netSalary === 6900, `netSalary=${c.data.data.netSalary} (expected 6900)`);
    const dup = await req('POST', '/hr/payroll', { token: hrToken, body });
    expect(dup.status === 409, `duplicate got ${dup.status} (expected 409)`);
    return 'draft created, net=6900, dup 409';
  });

  await test('PAYROLL: lifecycle draft→processed→paid; draft-only edit/delete enforced', async () => {
    const p = await req('PATCH', `/hr/payroll/${payrollId}/action`, { token: hrToken, body: { status: 'processed' } });
    expect(p.status === 200 && p.data.data.status === 'processed', `process ${p.status}/${p.data?.data?.status}`);
    const edit = await req('PATCH', `/hr/payroll/${payrollId}`, { token: hrToken, body: { allowances: 600 } });
    expect(edit.status === 400, `edit processed got ${edit.status} (expected 400)`);
    const del = await req('DELETE', `/hr/payroll/${payrollId}`, { token: hrToken });
    expect(del.status === 400, `delete processed got ${del.status} (expected 400)`);
    const paid = await req('PATCH', `/hr/payroll/${payrollId}/action`, { token: hrToken, body: { status: 'paid' } });
    expect(paid.status === 200 && paid.data.data.status === 'paid', `pay ${paid.status}/${paid.data?.data?.status}`);
    const skipPay = await req('PATCH', `/hr/payroll/${payrollId}/action`, { token: hrToken, body: { status: 'processed' } });
    expect(skipPay.status === 400, `paid→processed got ${skipPay.status} (expected 400)`);
    return 'processed → paid; edit/delete/regress blocked';
  });

  await test('PAYROLL: generate drafts for future period (creates missing, skips existing)', async () => {
    const g = await req('POST', '/hr/payroll/generate', { token: hrToken, body: { month: 7, year: 2028 } });
    expect([200, 201].includes(g.status), `generate ${g.status}: ${JSON.stringify(g.data).slice(0, 200)}`);
    expect(g.data.data.created > 0, `created=${g.data.data.created} (expected >0)`);
    const again = await req('POST', '/hr/payroll/generate', { token: hrToken, body: { month: 7, year: 2028 } });
    expect(again.status === 201 && again.data.data.created === 0 && again.data.data.skipped > 0, `re-run created=${again.data?.data?.created} skipped=${again.data?.data?.skipped}`);
    return `first run created=${g.data.data.created}, re-run skipped=${again.data.data.skipped}`;
  });

  await test('PAYROLL: employee role blocked (403)', async () => {
    const empLogin = await req('POST', '/auth/login', { body: { email: 'employee@miningerp.com', password: 'Admin@12345' } });
    expect(empLogin.status === 200, `emp login ${empLogin.status}`);
    const r = await req('GET', '/hr/payroll', { token: empLogin.data.data.accessToken });
    expect(r.status === 403, `got ${r.status} (expected 403)`);
    return '403 as expected';
  });

  // ---- ORPHAN CHECK: delete employee cascades login user ----
  await test('DELETE employee (with login) → linked user removed (cascade)', async () => {
    const d = await req('DELETE', `/hr/employees/${newEmpId}`, { token: hrToken });
    expect([200, 204].includes(d.status), `delete employee ${d.status}: ${JSON.stringify(d.data).slice(0, 200)}`);
    const gone = await req('GET', `/hr/employees/${newEmpId}`, { token: hrToken });
    expect(gone.status === 404, `employee still exists ${gone.status}`);
    const stillLogin = await req('POST', '/auth/login', { body: { email: newEmpEmail, password: 'HrFlow@12345' } });
    expect(stillLogin.status !== 200, `GAP: user survived employee deletion (login ${stillLogin.status})`);
    return 'employee + linked user removed, login blocked';
  });

  // ---- CLEANUP ----
  await test('CLEANUP: generated drafts removed; leftover user already gone', async () => {
    const list = await req('GET', '/hr/payroll?month=7&year=2028&limit=100', { token: adminToken });
    expect(list.status === 200, `list ${list.status}`);
    let removed = 0;
    for (const row of arr(list)) {
      const d = await req('DELETE', `/hr/payroll/${row.id}`, { token: adminToken });
      if ([200, 204, 404].includes(d.status)) removed += 1;
    }
    const du = await req('DELETE', `/users/${newUserId}`, { token: adminToken });
    expect([200, 204, 404].includes(du.status), `user delete ${du.status}`);
    const blocked = await req('POST', '/auth/login', { body: { email: newEmpEmail, password: tempPassword } });
    expect(blocked.status !== 200, 'user still login after delete');
    return `removed ${removed} draft rows; login blocked`;
  });

  const failed = results.filter((r) => !r.ok);
  console.log('\n========================================');
  console.log(`HR FLOW TOTAL: ${results.length} | PASS: ${results.length - failed.length} | FAIL: ${failed.length}`);
  if (failed.length) {
    console.log('FAILED:');
    failed.forEach((f) => console.log(`  FAIL | ${f.name} — ${f.info}`));
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
