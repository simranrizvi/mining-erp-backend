/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const day = (n) => {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
};
const rand = (min, max) => Math.round((Math.random() * (max - min) + min) * 10) / 10;

async function seedMineSites() {
  if ((await prisma.mineSite.count()) > 1) return prisma.mineSite.findMany();
  const sites = [
    { name: 'Atlas North Pit', code: 'MS-01', location: 'Nevada, USA', areaHectares: 420, status: 'active', establishedDate: new Date('2015-03-01') },
    { name: 'Red Valley Quarry', code: 'MS-02', location: 'Arizona, USA', areaHectares: 260, status: 'active', establishedDate: new Date('2018-07-15') },
    { name: 'Silver Creek Mine', code: 'MS-03', location: 'Utah, USA', areaHectares: 180, status: 'inactive', establishedDate: new Date('2012-01-20') },
  ];
  for (const s of sites) {
    await prisma.mineSite.upsert({ where: { code: s.code }, update: {}, create: s });
  }
  console.log('mine sites ok');
  return prisma.mineSite.findMany();
}

async function seedEmployees(sites) {
  if ((await prisma.employee.count()) > 0) return prisma.employee.findMany();
  const depts = await prisma.department.findMany();
  const dept = (n) => depts.find((d) => d.name === n);
  const rows = [
    ['Rajesh', 'Kumar', 'HR Manager', 'Human Resources', 'male'],
    ['Maria', 'Gonzalez', 'Finance Manager', 'Finance', 'female'],
    ['John', 'Carter', 'Operations Lead', 'Operations', 'male'],
    ['Amit', 'Patel', 'Mine Supervisor', 'Operations', 'male'],
    ['Sarah', 'Johnson', 'HR Officer', 'Human Resources', 'female'],
    ['David', 'Miller', 'Procurement Officer', 'Procurement', 'male'],
    ['Lin', 'Wei', 'Inventory Controller', 'Procurement', 'female'],
    ['Carlos', 'Ramirez', 'Maintenance Lead', 'Maintenance', 'male'],
    ['Priya', 'Sharma', 'Safety Officer', 'Safety & Compliance', 'female'],
    ['Tom', 'Becker', 'Excavator Operator', 'Operations', 'male'],
    ['Miguel', 'Santos', 'Dump Truck Driver', 'Operations', 'male'],
    ['Ahmed', 'Khan', 'Drill Operator', 'Operations', 'male'],
    ['Elena', 'Petrova', 'Geologist', 'Operations', 'female'],
    ['James', 'Wilson', 'Loader Operator', 'Operations', 'male'],
    ['Fatima', 'Ali', 'Accountant', 'Finance', 'female'],
    ['Robert', 'Brown', 'Store Keeper', 'Procurement', 'male'],
    ['Yuki', 'Tanaka', 'Mechanic', 'Maintenance', 'female'],
    ['Peter', 'Okafor', 'Security Supervisor', 'Safety & Compliance', 'male'],
  ];
  const salaries = { 'HR Manager': 7200, 'Finance Manager': 7800, 'Operations Lead': 7500, 'Mine Supervisor': 6200, 'HR Officer': 4200, 'Procurement Officer': 4500, 'Inventory Controller': 4000, 'Maintenance Lead': 5800, 'Safety Officer': 5000, 'Accountant': 4600, 'Store Keeper': 3200, 'Mechanic': 3800, 'Security Supervisor': 3600 };
  for (let i = 0; i < rows.length; i++) {
    const [firstName, lastName, designation, deptName, gender] = rows[i];
    await prisma.employee.create({
      data: {
        employeeCode: `EMP-${String(i + 1).padStart(3, '0')}`,
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@miningerp.com`,
        phone: `+1-555-01${String(i + 10).slice(-2)}`,
        gender,
        dateOfBirth: new Date(1985 + (i % 12), (i * 3) % 12, ((i * 7) % 27) + 1),
        address: `${100 + i} Main Street, Nevada, USA`,
        departmentId: dept(deptName) ? dept(deptName).id : null,
        designation,
        mineSiteId: sites[i % sites.length].id,
        dateOfJoining: new Date(2019 + (i % 6), (i * 2) % 12, (i % 27) + 1),
        employmentType: i % 7 === 5 ? 'contract' : 'full_time',
        status: i === 17 ? 'on_leave' : 'active',
        basicSalary: salaries[designation] || 3500 + (i % 5) * 400,
        bankName: ['Chase Bank', 'Bank of America', 'Wells Fargo'][i % 3],
        bankAccountNo: `ACCT-${900000 + i * 137}`,
        emergencyContact: `+1-555-02${String(i + 10).slice(-2)}`,
      },
    });
  }
  console.log('employees ok');
  return prisma.employee.findMany();
}

async function seedEquipmentVehicles(sites, employees) {
  const ops = employees.filter((e) => e.designation && e.designation.includes('Operator'));
  if ((await prisma.equipment.count()) === 0) {
    const eq = [
      ['Hydraulic Excavator CAT 390F', 'EQ-EXC-01', 'excavator', 'Caterpillar', '390F', 4820],
      ['Hydraulic Excavator Komatsu PC2000', 'EQ-EXC-02', 'excavator', 'Komatsu', 'PC2000', 3150],
      ['Rotary Drill Rig Sandvik DE150', 'EQ-DRILL-01', 'drill', 'Sandvik', 'DE150', 2100],
      ['Wheel Loader CAT 992K', 'EQ-LDR-01', 'loader', 'Caterpillar', '992K', 6400],
      ['Jaw Crusher Metso C200', 'EQ-CRS-01', 'crusher', 'Metso', 'C200', 9100],
      ['Conveyor System FLSmidth', 'EQ-CNV-01', 'conveyor', 'FLSmidth', 'B1200', 12400],
      ['Bulldozer CAT D11', 'EQ-DOZ-01', 'dozer', 'Caterpillar', 'D11', 5300],
      ['Grader CAT 24M3', 'EQ-GRD-01', 'grader', 'Caterpillar', '24M3', 1750],
      ['Water Truck CAT 773E', 'EQ-WTR-01', 'water_truck', 'Caterpillar', '773E', 8900],
      ['Crane Liebherr LTM 1300', 'EQ-CRN-01', 'crane', 'Liebherr', 'LTM 1300', 620],
    ];
    for (let i = 0; i < eq.length; i++) {
      const [name, code, type, manufacturer, model, hours] = eq[i];
      await prisma.equipment.create({
        data: {
          name, code, type, manufacturer, model,
          serialNumber: `SN-${manufacturer.slice(0, 3).toUpperCase()}-${1000 + i * 7}`,
          mineSiteId: sites[i % 2].id,
          purchaseDate: new Date(2020 + (i % 5), (i * 2) % 12, 10),
          purchaseCost: 250000 + i * 85000,
          status: i === 4 ? 'under_maintenance' : i === 9 ? 'breakdown' : 'operational',
          currentHours: hours,
          assignedOperatorId: ops[i % Math.max(ops.length, 1)] ? ops[i % ops.length].id : null,
        },
      });
    }
    console.log('equipment ok');
  }
  if ((await prisma.vehicle.count()) === 0) {
    const vh = [
      ['Volvo A40G Hauler', 'NV-TRK-101', 'dump_truck', 'Volvo', 'A40G', 2021, 48200],
      ['Volvo A40G Hauler', 'NV-TRK-102', 'dump_truck', 'Volvo', 'A40G', 2021, 51100],
      ['CAT 777F Haul Truck', 'NV-TRK-103', 'dump_truck', 'Caterpillar', '777F', 2019, 88400],
      ['Toyota Hilux Pickup', 'NV-PKP-201', 'pickup', 'Toyota', 'Hilux', 2022, 24500],
      ['Toyota Hilux Pickup', 'NV-PKP-202', 'pickup', 'Toyota', 'Hilux', 2022, 19800],
      ['Ford Transit Crew Bus', 'NV-BUS-301', 'bus', 'Ford', 'Transit', 2020, 62300],
      ['Isuzu Fuel Tanker', 'NV-TNK-401', 'tanker', 'Isuzu', 'FVR', 2021, 33700],
      ['Ford F-350 Service Van', 'NV-SVC-501', 'service', 'Ford', 'F-350', 2023, 12100],
    ];
    const drivers = employees.filter((e) => e.designation && (e.designation.includes('Driver') || e.designation.includes('Operator')));
    for (let i = 0; i < vh.length; i++) {
      const [name, plateNumber, type, make, mdl, year, odo] = vh[i];
      await prisma.vehicle.create({
        data: {
          name, plateNumber, type, make, model: mdl, year,
          mineSiteId: sites[i % 2].id,
          status: i === 6 ? 'under_maintenance' : 'operational',
          currentOdometer: odo,
          fuelType: 'diesel',
          assignedDriverId: drivers.length ? drivers[i % drivers.length].id : null,
          purchaseDate: new Date(year, 3, 15),
          purchaseCost: 45000 + i * 22000,
        },
      });
    }
    console.log('vehicles ok');
  }
}

async function seedProduction(sites, employees) {
  if ((await prisma.production.count()) > 0) return;
  const equipment = await prisma.equipment.findMany();
  const operators = employees.filter((e) => e.designation && e.designation.includes('Operator'));
  const materials = ['Limestone', 'Granite', 'Marble Block', 'Iron Ore', 'Silica Sand'];
  const grades = ['A', 'B', 'C'];
  for (let d = 45; d >= 0; d--) {
    const perDay = 1 + (d % 2);
    for (let k = 0; k < perDay; k++) {
      const eq = equipment[(d + k) % equipment.length];
      await prisma.production.create({
        data: {
          mineSiteId: (d + k) % 5 === 0 ? sites[1].id : sites[0].id,
          date: day(-d),
          shift: k === 0 ? 'day' : 'night',
          materialType: materials[(d + k) % materials.length],
          quantity: rand(120, 850),
          unit: 'tons',
          qualityGrade: grades[(d + k) % grades.length],
          equipmentId: eq ? eq.id : null,
          operatorId: operators.length ? operators[(d + k) % operators.length].id : null,
          remarks: d % 7 === 0 ? 'Reduced output due to weather' : null,
        },
      });
    }
  }
  console.log('production ok');
}

async function seedAttendanceEmployees(sites, employees) {
  if ((await prisma.attendance.count()) > 0) return;
  for (let d = 20; d >= 0; d--) {
    const dt = day(-d);
    if (dt.getDay() === 0) continue;
    for (let i = 0; i < employees.length; i++) {
      const e = employees[i];
      const r = (d * 7 + i * 13) % 20;
      const status = r < 15 ? 'present' : r < 17 ? 'late' : r === 17 ? 'absent' : r === 18 ? 'on_leave' : 'half_day';
      if (status === 'absent' || status === 'on_leave') {
        await prisma.attendance.create({ data: { employeeId: e.id, mineSiteId: e.mineSiteId, date: dt, status } });
        continue;
      }
      const inH = status === 'late' ? 9 : 6;
      const checkIn = new Date(dt); checkIn.setHours(inH, (i * 7) % 60, 0, 0);
      const checkOut = new Date(dt); checkOut.setHours(status === 'half_day' ? 13 : 17, (i * 11) % 60, 0, 0);
      await prisma.attendance.create({
        data: {
          employeeId: e.id, mineSiteId: e.mineSiteId, date: dt,
          checkIn, checkOut, status,
          hoursWorked: status === 'half_day' ? 4 : status === 'late' ? 8 : 10.5,
        },
      });
    }
  }
  console.log('attendance ok');
}

async function seedLeavePayroll(employees) {
  if ((await prisma.leaveRequest.count()) === 0) {
    const types = await prisma.leaveType.findMany();
    const admin = await prisma.user.findFirst({ where: { email: 'admin@miningerp.com' } });
    const rows = [
      [0, 'Annual Leave', -10, -5, 'Family trip', 'approved'],
      [1, 'Sick Leave', -6, -4, 'Viral fever', 'approved'],
      [2, 'Casual Leave', -3, -3, 'Personal work', 'pending'],
      [3, 'Annual Leave', 5, 9, 'Vacation', 'pending'],
      [4, 'Unpaid Leave', -14, -12, 'Emergency', 'rejected'],
      [5, 'Sick Leave', -2, -1, 'Medical checkup', 'approved'],
    ];
    for (const [empIdx, typeName, s, e, reason, status] of rows) {
      await prisma.leaveRequest.create({
        data: {
          employeeId: employees[empIdx].id,
          leaveTypeId: types.find((t) => t.name === typeName).id,
          startDate: day(s), endDate: day(e), reason, status,
          approvedById: status === 'pending' ? null : admin ? admin.id : null,
          actionAt: status === 'pending' ? null : day(-1),
          actionRemarks: status === 'rejected' ? 'Peak season, cannot approve' : 'Approved by admin',
        },
      });
    }
    console.log('leave requests ok');
  }
  const now = new Date();
  const months = [{ m: now.getMonth() + 1, y: now.getFullYear() }, { m: now.getMonth() === 0 ? 12 : now.getMonth(), y: now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear() }];
  for (const { m, y } of months) {
    for (const e of employees) {
      const exists = await prisma.payroll.findUnique({ where: { employeeId_month_year: { employeeId: e.id, month: m, year: y } } });
      if (exists) continue;
      const allowances = Math.round(e.basicSalary * 0.15);
      const deductions = Math.round(e.basicSalary * 0.08);
      const overtime = (m + e.firstName.length) % 3 === 0 ? 450 : 0;
      const status = m === now.getMonth() + 1 && y === now.getFullYear() ? (e.firstName.length % 2 ? 'processed' : 'draft') : 'paid';
      await prisma.payroll.create({
        data: {
          employeeId: e.id, month: m, year: y,
          basicSalary: e.basicSalary, allowances, deductions, overtimePay: overtime,
          netSalary: e.basicSalary + allowances + overtime - deductions,
          status,
          processedAt: status === 'draft' ? null : day(-8),
          paidAt: status === 'paid' ? day(-5) : null,
        },
      });
    }
  }
  console.log('payroll ok');
}

async function seedInventory(sites) {
  if ((await prisma.inventoryItem.count()) === 0) {
    const cats = await prisma.inventoryCategory.findMany();
    const cat = (n) => (cats.find((c) => c.name === n) || {}).id;
    const whs = [];
    whs.push(await prisma.warehouse.create({ data: { name: 'Main Store - North Pit', mineSiteId: sites[0].id, location: 'Gate 1, Block A', capacity: 5000 } }));
    whs.push(await prisma.warehouse.create({ data: { name: 'Quarry Store', mineSiteId: sites[1].id, location: 'East Entry', capacity: 2500 } }));
    const items = [
      ['SP-001', 'Excavator Bucket Teeth', 'Spare Parts', 'pcs', 180, 40, 85],
      ['SP-002', 'Hydraulic Hose 3/4"', 'Spare Parts', 'pcs', 64, 30, 42],
      ['SP-003', 'Conveyor Belt 20m', 'Spare Parts', 'roll', 12, 5, 1250],
      ['SP-004', 'Filter Kit - CAT 390F', 'Spare Parts', 'kit', 28, 15, 210],
      ['SG-001', 'Safety Helmet', 'Safety Gear', 'pcs', 240, 100, 22],
      ['SG-002', 'Hi-Vis Jacket', 'Safety Gear', 'pcs', 175, 80, 35],
      ['SG-003', 'Steel Toe Boots', 'Safety Gear', 'prs', 96, 50, 78],
      ['SG-004', 'Dust Mask P100', 'Safety Gear', 'box', 45, 25, 60],
      ['CN-001', 'Diesel Engine Oil 15W-40', 'Consumables', 'drum', 34, 20, 320],
      ['CN-002', 'Cutting Wire', 'Consumables', 'coil', 58, 25, 95],
      ['TL-001', 'Torque Wrench Set', 'Tools', 'set', 14, 8, 260],
      ['TL-002', 'Portable Welder', 'Tools', 'pcs', 6, 3, 1450],
      ['LB-001', 'Gear Oil ISO 320', 'Lubricants', 'drum', 22, 12, 285],
      ['LB-002', 'Grease EP2', 'Lubricants', 'pail', 40, 20, 65],
      ['SP-005', 'Track Chain Link', 'Spare Parts', 'pcs', 8, 10, 480],
    ];
    for (let i = 0; i < items.length; i++) {
      const [sku, name, catName, unit, qty, reorder, price] = items[i];
      await prisma.inventoryItem.create({
        data: {
          sku, name, unit,
          categoryId: cat(catName),
          quantityInStock: qty, reorderLevel: reorder, unitPrice: price,
          warehouseId: whs[i % whs.length].id,
        },
      });
    }
    const all = await prisma.inventoryItem.findMany();
    for (let i = 0; i < all.length; i++) {
      const it = all[i];
      await prisma.stockMovement.createMany({
        data: [
          { itemId: it.id, warehouseId: it.warehouseId, type: 'in', quantity: it.quantityInStock + 40, reference: `PO-2026-${100 + i}`, date: day(-30), remarks: 'Opening stock' },
          { itemId: it.id, warehouseId: it.warehouseId, type: 'out', quantity: 40, reference: `REQ-${200 + i}`, date: day(-10), remarks: 'Issued to operations' },
        ],
      });
    }
    console.log('inventory ok');
  }
}

async function seedProcurement(sites, employees, users) {
  if ((await prisma.vendor.count()) === 0) {
    const vendors = [
      ['StoneTech Supplies Pvt Ltd', 'Ravi Mehta', 'sales@stonetech.example', 'Spare Parts', 4.5],
      ['MineSafe Equipment Co.', 'Laura Kim', 'orders@minesafe.example', 'Safety Gear', 4.2],
      ['GlobalLube Distributors', 'Ahmed Saeed', 'info@globallube.example', 'Lubricants', 3.9],
      ['HeavyMach Parts Inc.', 'Dan Brooks', 'support@heavymach.example', 'Spare Parts', 4.7],
      ['FuelCorp Trading', 'Nina Volkov', 'b2b@fuelcorp.example', 'Fuel', 4.1],
      ['ProTools Wholesale', 'Sam Ortiz', 'contact@protools.example', 'Tools', 3.6],
    ];
    for (const [name, contactPerson, email, category, rating] of vendors) {
      await prisma.vendor.create({ data: { name, contactPerson, email, phone: '+1-555-7000', address: 'Industrial Zone, Nevada, USA', category, status: 'active', rating } });
    }
    console.log('vendors ok');
  }
  if ((await prisma.purchaseRequest.count()) === 0) {
    const vendors = await prisma.vendor.findMany();
    const items = await prisma.inventoryItem.findMany();
    const requester = employees.find((e) => e.designation === 'Procurement Officer') || employees[0];
    const admin = users.find((u) => u.email === 'admin@miningerp.com');
    const statuses = ['pending', 'approved', 'rejected', 'converted', 'approved'];
    for (let i = 0; i < 5; i++) {
      const pr = await prisma.purchaseRequest.create({
        data: {
          requestNumber: `PR-2026-${String(1001 + i)}`,
          requestedById: requester.id,
          mineSiteId: sites[i % 2].id,
          status: statuses[i],
          justification: 'Stock below reorder level, urgent replenishment needed.',
          requiredDate: day(7 + i * 3),
          actionAt: statuses[i] === 'pending' ? null : day(-3),
          actionById: statuses[i] === 'pending' ? null : admin ? admin.id : null,
          actionRemarks: statuses[i] === 'rejected' ? 'Budget constraint this month' : 'Approved',
        },
      });
      const pick = [items[i % items.length], items[(i + 3) % items.length]];
      let est = 0;
      for (const it of pick) {
        const qty = 5 + i * 3;
        est += qty * it.unitPrice;
        await prisma.purchaseRequestItem.create({ data: { purchaseRequestId: pr.id, itemId: it.id, description: it.name, quantity: qty, estimatedCost: qty * it.unitPrice } });
      }
      if (statuses[i] === 'converted') {
        const po = await prisma.purchaseOrder.create({
          data: {
            poNumber: `PO-2026-${String(501 + i)}`,
            vendorId: vendors[i % vendors.length].id,
            purchaseRequestId: pr.id,
            status: 'received',
            orderDate: day(-6),
            expectedDeliveryDate: day(4),
            totalAmount: est,
            createdById: admin ? admin.id : null,
          },
        });
        for (const it of pick) {
          const qty = 5 + i * 3;
          await prisma.purchaseOrderItem.create({ data: { purchaseOrderId: po.id, itemId: it.id, description: it.name, quantity: qty, unitPrice: it.unitPrice, receivedQuantity: qty } });
        }
        await prisma.invoice.create({
          data: { invoiceNumber: `INV-P-${601 + i}`, type: 'purchase', partyName: vendors[i % vendors.length].name, amount: est, tax: Math.round(est * 0.1), totalAmount: est + Math.round(est * 0.1), dueDate: day(10), status: 'paid', issueDate: day(-5), purchaseOrderId: po.id },
        });
      }
    }
    for (let i = 0; i < 3; i++) {
      const amt = 8000 + i * 5500;
      await prisma.invoice.create({
        data: { invoiceNumber: `INV-S-${701 + i}`, type: 'sales', partyName: ['Vertex Construction', 'Noble Builders', 'Metro Infra'][i], amount: amt, tax: Math.round(amt * 0.1), totalAmount: amt + Math.round(amt * 0.1), dueDate: day(14 + i * 5), status: i === 0 ? 'overdue' : i === 1 ? 'sent' : 'paid', issueDate: day(-20 + i * 5) },
      });
    }
    console.log('procurement ok');
  }
}

async function seedFinance(sites, employees, users) {
  if ((await prisma.expense.count()) === 0) {
    const cats = await prisma.expenseCategory.findMany();
    const submitters = users.filter((u) => u.email !== 'admin@miningerp.com');
    const methods = ['cash', 'bank_transfer', 'cheque', 'card'];
    const statuses = ['paid', 'approved', 'pending', 'paid', 'pending'];
    for (let i = 0; i < 18; i++) {
      const cat = cats[i % cats.length];
      const amt = Math.round(400 + Math.random() * 9000);
      const status = statuses[i % statuses.length];
      await prisma.expense.create({
        data: {
          expenseNumber: `EXP-2026-${String(9001 + i)}`,
          categoryId: cat.id,
          mineSiteId: sites[i % 2].id,
          amount: amt,
          date: day(-(i % 28)),
          description: `${cat.name} - site operations`,
          paidTo: ['Vendor payments', 'Staff reimbursements', 'Utility provider'][i % 3],
          paymentMethod: methods[i % 4],
          status,
          submittedById: submitters.length ? submitters[i % submitters.length].id : null,
          approvedById: status === 'pending' ? null : (users.find((u) => u.email === 'admin@miningerp.com') || {}).id,
        },
      });
    }
    const paid = await prisma.expense.findMany({ where: { status: 'paid' } });
    for (let i = 0; i < paid.length; i++) {
      await prisma.payment.create({
        data: { paymentNumber: `PAY-2026-${String(301 + i)}`, expenseId: paid[i].id, amount: paid[i].amount, method: paid[i].paymentMethod, date: paid[i].date, reference: `REF-${9000 + i}`, status: 'completed' },
      });
    }
    const invoices = await prisma.invoice.findMany({ where: { status: 'paid' } });
    for (let i = 0; i < invoices.length; i++) {
      await prisma.payment.create({
        data: { paymentNumber: `PAY-INV-${401 + i}`, invoiceId: invoices[i].id, amount: invoices[i].totalAmount, method: 'bank_transfer', date: day(-4), reference: `WIRE-${7000 + i}`, status: 'completed' },
      });
    }
    console.log('expenses ok');
  }
  if ((await prisma.budget.count()) === 0) {
    const cats = ['Equipment', 'Fuel', 'Maintenance', 'Salaries', 'Safety', 'Infrastructure'];
    for (let i = 0; i < cats.length; i++) {
      const allocated = 50000 + i * 35000;
      await prisma.budget.create({
        data: {
          mineSiteId: i % 2 === 0 ? sites[0].id : sites[1].id,
          department: ['Operations', 'Operations', 'Maintenance', 'Human Resources', 'Safety & Compliance', 'Operations'][i],
          category: cats[i],
          fiscalYear: 2026,
          period: i % 3 === 0 ? 'monthly' : 'yearly',
          allocatedAmount: allocated,
          spentAmount: Math.round(allocated * (0.25 + (i % 4) * 0.18)),
        },
      });
    }
    console.log('budgets ok');
  }
  const invoices = await prisma.invoice.findMany({ where: { status: 'sent' } });
  for (const inv of invoices) {
    const exists = await prisma.payment.findFirst({ where: { invoiceId: inv.id } });
    if (!exists) {
      await prisma.payment.create({ data: { paymentNumber: `PAY-${inv.invoiceNumber}`, invoiceId: inv.id, amount: inv.totalAmount, method: 'bank_transfer', date: day(-2), reference: 'ADVANCE-50%', status: 'pending' } });
    }
  }
}

async function seedMaintenance(sites) {
  if ((await prisma.equipment.count()) === 0) return;
  if ((await prisma.maintenanceSchedule.count()) > 0) return;
  const equipment = await prisma.equipment.findMany();
  const vehicles = await prisma.vehicle.findMany();
  const employees = await prisma.employee.findMany();
  const vendors = await prisma.vendor.findMany();
  const maint = employees.find((e) => e.designation === 'Maintenance Lead');
  for (let i = 0; i < 8; i++) {
    const eq = equipment[i % equipment.length];
    await prisma.maintenanceSchedule.create({
      data: { equipmentId: eq.id, type: i % 3 === 0 ? 'corrective' : 'preventive', frequencyDays: i % 3 === 0 ? null : 30, scheduledDate: day(i * 4 - 12), description: `${eq.name} scheduled service`, status: i < 4 ? 'completed' : i === 4 ? 'overdue' : 'scheduled' },
    });
    await prisma.maintenanceRecord.create({
      data: {
        equipmentId: eq.id,
        maintenanceType: i % 3 === 0 ? 'corrective' : 'preventive',
        description: `Oil change, filter replacement and inspection - ${eq.name}`,
        cost: Math.round(300 + Math.random() * 4200),
        performedById: maint ? maint.id : null,
        vendorId: vendors.length ? vendors[i % vendors.length].id : null,
        startDate: day(-(i * 3) - 1),
        endDate: i < 5 ? day(-(i * 3)) : null,
        status: i < 5 ? 'completed' : 'in_progress',
        partsUsed: [{ part: 'Filter kit', qty: 2 }, { part: 'Oil 15W-40', qty: 4 }],
        downtimeHours: Math.round(2 + Math.random() * 20),
      },
    });
  }
  for (let i = 0; i < 3; i++) {
    const v = vehicles[i];
    await prisma.maintenanceSchedule.create({ data: { vehicleId: v.id, type: 'preventive', frequencyDays: 90, scheduledDate: day(10 + i * 7), description: `${v.name} periodic service`, status: 'scheduled' } });
    await prisma.maintenanceRecord.create({ data: { vehicleId: v.id, maintenanceType: 'corrective', description: 'Brake pads and tire replacement', cost: 850 + i * 240, performedById: maint ? maint.id : null, startDate: day(-7), endDate: day(-6), status: 'completed', downtimeHours: 6 } });
  }
  console.log('maintenance ok');
}

async function seedFuel(sites, employees) {
  if ((await prisma.fuelStation.count()) === 0) {
    const s1 = await prisma.fuelStation.create({ data: { name: 'North Pit Fuel Bay', mineSiteId: sites[0].id, capacity: 20000, currentStock: 14500, fuelType: 'diesel' } });
    const s2 = await prisma.fuelStation.create({ data: { name: 'Quarry Fuel Point', mineSiteId: sites[1].id, capacity: 10000, currentStock: 6200, fuelType: 'diesel' } });
    const vehicles = await prisma.vehicle.findMany();
    const equipment = await prisma.equipment.findMany();
    const issuers = employees.filter((e) => e.designation && (e.designation.includes('Supervisor') || e.designation.includes('Store')));
    for (let i = 0; i < 24; i++) {
      const useVehicle = i % 3 !== 0;
      await prisma.fuelTransaction.create({
        data: {
          fuelStationId: i % 2 === 0 ? s1.id : s2.id,
          vehicleId: useVehicle && vehicles.length ? vehicles[i % vehicles.length].id : null,
          equipmentId: !useVehicle && equipment.length ? equipment[i % equipment.length].id : null,
          quantity: rand(40, 320),
          odometerReading: useVehicle ? 10000 + i * 480 : null,
          cost: Math.round(rand(40, 320) * 1.35),
          issuedById: issuers.length ? issuers[i % issuers.length].id : null,
          date: day(-(i % 21)),
          purpose: useVehicle ? 'Haulage operations' : 'Equipment operation',
        },
      });
    }
    const vendors = await prisma.vendor.findMany();
    for (let i = 0; i < 5; i++) {
      const qty = 3000 + i * 1200;
      await prisma.fuelPurchase.create({
        data: { fuelStationId: i % 2 === 0 ? s1.id : s2.id, vendorId: vendors.length ? vendors[4 % vendors.length].id : null, quantity: qty, cost: Math.round(qty * 1.35), purchaseDate: day(-(i * 6) - 2), invoiceNumber: `FUEL-INV-${101 + i}` },
      });
    }
    console.log('fuel ok');
  }
}

async function seedMisc(users) {
  if ((await prisma.notification.count()) === 0) {
    const admin = users.find((u) => u.email === 'admin@miningerp.com');
    if (admin) {
      await prisma.notification.createMany({
        data: [
          { userId: admin.id, title: 'Low stock alert', message: 'Track Chain Link (SP-005) is below reorder level.', type: 'warning', link: '/inventory' },
          { userId: admin.id, title: 'Leave request pending', message: '2 leave requests awaiting your approval.', type: 'info', link: '/hr/leave' },
          { userId: admin.id, title: 'Maintenance overdue', message: 'Jaw Crusher Metso C200 preventive maintenance is overdue.', type: 'error', link: '/maintenance' },
          { userId: admin.id, title: 'PO received', message: 'PO-2026-504 has been received in full.', type: 'success', link: '/procurement' },
        ],
      });
    }
    console.log('notifications ok');
  }
  if ((await prisma.auditLog.count()) === 0) {
    const admin = users.find((u) => u.email === 'admin@miningerp.com');
    await prisma.auditLog.createMany({
      data: [
        { userId: admin ? admin.id : null, action: 'LOGIN', module: 'auth', description: 'Super Admin logged in', ipAddress: '127.0.0.1' },
        { userId: admin ? admin.id : null, action: 'CREATE', module: 'hr.employees', description: 'Created employee EMP-018', ipAddress: '127.0.0.1' },
        { userId: admin ? admin.id : null, action: 'UPDATE', module: 'inventory.items', description: 'Updated stock for SP-005', ipAddress: '127.0.0.1' },
        { userId: admin ? admin.id : null, action: 'APPROVE', module: 'finance.expenses', description: 'Approved expense EXP-2026-9004', ipAddress: '127.0.0.1' },
      ],
    });
    console.log('audit logs ok');
  }
  if ((await prisma.systemSetting.count()) === 0) {
    await prisma.systemSetting.createMany({
      data: [
        { key: 'company_name', value: 'Atlas Mining Corporation', category: 'general' },
        { key: 'currency', value: 'USD', category: 'general' },
        { key: 'fiscal_year_start', value: '01-01', category: 'finance' },
        { key: 'low_stock_threshold_email', value: 'ops@miningerp.com', category: 'inventory' },
      ],
    });
    console.log('settings ok');
  }
}

async function main() {
  console.log('🌱 Seeding demo data...\n');
  const sites = await seedMineSites();
  const employees = await seedEmployees(sites);
  await seedEquipmentVehicles(sites, employees);
  await seedProduction(sites, employees);
  await seedAttendanceEmployees(sites, employees);
  await seedLeavePayroll(employees);
  await seedInventory(sites);
  const users = await prisma.user.findMany();
  await seedProcurement(sites, employees, users);
  await seedFinance(sites, employees, users);
  await seedMaintenance(sites);
  await seedFuel(sites, employees);
  await seedMisc(users);
  console.log('\n✅ Demo data seed complete.');
}

main()
  .catch((e) => {
    console.error('❌ Failed:', e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
