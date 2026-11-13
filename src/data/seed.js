/**
 * Deterministic mock-data generator.
 *
 * All dates are generated relative to "today" so the dashboard always shows
 * a live-looking clinic day (tokens waiting, consultations running, bills
 * pending) plus ~90 days of history for charts and reports.
 */
import { DEFAULT_ROLES, SUPPLIERS } from './constants';
import {
  AREAS,
  FIRST_NAMES_F,
  FIRST_NAMES_M,
  LAST_NAMES,
  MEDICINE_CATALOG,
  SCENARIOS,
} from './catalog';
import { computeBillTotals, computeConsultationFee } from '@/utils/billing';
import { addDays, dateKey } from '@/utils/format';
import config from '@/config';

export const SEED_VERSION = 4;
const HISTORY_DAYS = config.demoHistoryDays;

/* --------------------------- defaults ---------------------------- */

export function defaultSettings() {
  return {
    clinic: {
      name: 'Zaib Clinic',
      tagline: 'Care · Trust · Hospitality',
      address: 'Plot 12-B, Main Boulevard, Gulberg III',
      city: 'Lahore, Pakistan',
      phone: '+92 42 3570 1122',
      mobile: '+92 300 123 4567',
      email: 'care@zaibclinic.com',
      website: 'www.zaibclinic.com',
      registrationNo: 'PHC/LHR/2021/0458',
      timings: 'Mon – Sat · 9:00 AM – 2:00 PM & 5:00 PM – 10:00 PM',
    },
    logo: null, // custom uploaded logo (data URL); null = built-in logo
    fees: {
      currency: 'Rs.',
      consultationFee: 1500,
      allowManualDiscount: true,
      maxDiscountPercent: 50,
    },
    feeRules: {
      regular: { type: 'full', value: 0 },
      follow_up: { type: 'fixed', value: 700 },
      same_day_follow_up: { type: 'free', value: 0 },
      next_day_follow_up: { type: 'fixed', value: 500 },
      discounted: { type: 'percent', value: 30 },
      free: { type: 'free', value: 0 },
      no_charge: { type: 'free', value: 0 },
    },
    followUp: {
      sameDayWindowHours: 12,
      nextDayWindowDays: 1,
      standardFollowUpDays: 7,
    },
    receipt: {
      showLogo: true,
      showContact: true,
      showMedicineDetails: true,
      header: 'OPD Payment Receipt',
      footer: 'Thank you for trusting Zaib Clinic. Wishing you a speedy recovery!',
      note: 'Please keep this receipt for your follow-up visit.',
      paperWidth: '80mm',
    },
    prescription: {
      showLogo: true,
      showVitals: true,
      showSignature: true,
      clinicTitle: 'Clinic Prescription',
      storeTitle: 'Medical Store Prescription',
      footerNote: 'This prescription is valid for 30 days. Do not self-medicate. In case of emergency call +92 300 123 4567.',
    },
  };
}

export function defaultStaff() {
  return [
    {
      id: 'STF-001',
      name: 'Zainab Malik',
      email: 'admin@zaibclinic.com',
      password: 'Admin@1234',
      role: 'admin',
      designation: 'Clinic Administrator',
      phone: '0300-1234567',
      status: 'active',
      joinedAt: '2021-03-01',
    },
    {
      id: 'STF-002',
      name: 'Dr. Zaib Hassan',
      email: 'doctor@zaibclinic.com',
      password: 'Doctor@1234',
      role: 'doctor',
      designation: 'Chief Physician · MBBS, FCPS',
      room: 'Room 1',
      phone: '0301-2233445',
      status: 'active',
      joinedAt: '2021-03-01',
    },
    {
      id: 'STF-003',
      name: 'Dr. Sana Iqbal',
      email: 'sana@zaibclinic.com',
      password: 'Doctor@1234',
      role: 'doctor',
      designation: 'General Physician · MBBS, MCPS',
      room: 'Room 2',
      phone: '0302-5566778',
      status: 'active',
      joinedAt: '2022-07-15',
    },
    {
      id: 'STF-004',
      name: 'Hira Khan',
      email: 'reception@zaibclinic.com',
      password: 'Staff@1234',
      role: 'receptionist',
      designation: 'Front Desk Officer',
      phone: '0321-4455667',
      status: 'active',
      joinedAt: '2022-01-10',
    },
    {
      id: 'STF-005',
      name: 'Bilal Ahmed',
      email: 'pharmacy@zaibclinic.com',
      password: 'Staff@1234',
      role: 'pharmacist',
      designation: 'Pharmacist / Staff Nurse',
      phone: '0333-7788990',
      status: 'active',
      joinedAt: '2022-04-04',
    },
    {
      id: 'STF-006',
      name: 'Usman Tariq',
      email: 'billing@zaibclinic.com',
      password: 'Staff@1234',
      role: 'cashier',
      designation: 'Cashier & Accounts',
      phone: '0345-1122334',
      status: 'active',
      joinedAt: '2023-02-20',
    },
    {
      id: 'STF-007',
      name: 'Farah Naz',
      email: 'farah@zaibclinic.com',
      password: 'Staff@1234',
      role: 'receptionist',
      designation: 'Evening Receptionist',
      phone: '0312-9988776',
      status: 'inactive',
      joinedAt: '2023-09-01',
    },
  ];
}

/* ----------------------------- RNG ------------------------------- */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------------------- builder ---------------------------- */

export function createSeed(now = new Date()) {
  const rng = mulberry32(1311 + now.getDate() * 97 + now.getMonth() * 13);
  const between = (a, b) => Math.floor(rng() * (b - a + 1)) + a;
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const chance = (p) => rng() < p;
  const weighted = (entries) => {
    const total = entries.reduce((a, [, w]) => a + w, 0);
    let r = rng() * total;
    for (const [v, w] of entries) {
      r -= w;
      if (r <= 0) return v;
    }
    return entries[entries.length - 1][0];
  };

  let uidCounter = 0;
  const uid = (prefix) => `${prefix}-${(++uidCounter).toString(36).toUpperCase().padStart(5, '0')}`;

  const settings = defaultSettings();
  const roles = JSON.parse(JSON.stringify(DEFAULT_ROLES));
  const staff = defaultStaff();
  const doctors = staff.filter((s) => s.role === 'doctor');
  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  /* ---------- medicines ---------- */
  const medicines = MEDICINE_CATALOG.map(
    ([id, name, generic, category, unit, purchase, selling, sup, min, , expiry], idx) => ({
      id,
      name,
      genericName: generic,
      category,
      unit,
      purchasePrice: purchase,
      sellingPrice: selling,
      supplier: SUPPLIERS[sup],
      minStock: min,
      currentStock: 0,
      totalReceived: 0,
      totalConsumed: 0,
      totalAdjusted: 0,
      batchNo: `B${String(now.getFullYear()).slice(2)}${String(1200 + idx * 37).padStart(4, '0')}`,
      expiryDate: dateKey(addDays(today0, expiry)),
      entryDate: dateKey(addDays(today0, -HISTORY_DAYS)),
      notes: '',
    }),
  );
  const medById = Object.fromEntries(medicines.map((m) => [m.id, m]));

  /* ---------- patients ---------- */
  const patients = [];
  let patientSeq = 10000;

  function makePatient(registeredAt) {
    const gender = chance(0.52) ? 'Male' : 'Female';
    const first = pick(gender === 'Male' ? FIRST_NAMES_M : FIRST_NAMES_F);
    const name = `${first} ${pick(LAST_NAMES)}`;
    const age = chance(0.14) ? between(2, 12) : between(16, 78);
    const tagRoll = rng();
    const tags = tagRoll < 0.08 ? ['free'] : tagRoll < 0.15 ? ['discounted'] : ['regular'];
    const p = {
      id: `ZC-${++patientSeq}`,
      name,
      phone: `03${between(0, 4)}${between(0, 9)}-${between(1000000, 9999999)}`,
      age,
      gender,
      address: `House ${between(1, 420)}, Street ${between(1, 30)}, ${pick(AREAS)}, Lahore`,
      bloodGroup: pick(['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-', '']),
      registeredAt: registeredAt.toISOString(),
      tags,
      notes: tags[0] === 'free' ? 'Approved for free consultation (welfare programme).' : '',
    };
    patients.push(p);
    return p;
  }

  // Existing patient base registered before the history window
  for (let i = 0; i < 60; i++) {
    const d = addDays(today0, -between(HISTORY_DAYS + 5, HISTORY_DAYS + 300));
    d.setHours(between(9, 20), between(0, 59));
    makePatient(d);
  }

  /* ---------- visits, bills, consumption ---------- */
  const visits = [];
  const bills = [];
  const movements = [];
  let billSeq = 0;
  const visitsByDay = {};

  const makeVitals = (age) => ({
    bp: `${between(108, 150)}/${between(68, 95)}`,
    pulse: between(68, 108),
    temp: (between(978, 1024) / 10).toFixed(1),
    weight: age < 13 ? between(12, 40) : between(48, 96),
    spo2: between(94, 99),
  });

  function buildPrescriptions(scenario, consultedAt, dispensed, compact = false) {
    const clinicItems = scenario.clinic.map(([medicineId, dosage, quantity, instructions]) => ({
      id: uid('RXI'),
      medicineId,
      name: medById[medicineId].name,
      dosage,
      quantity,
      instructions,
      dispensed,
      dispensedQty: dispensed ? quantity : 0,
    }));
    const storeItems = scenario.store.map(([name, dosage, quantity, instructions]) => ({
      id: uid('RXI'),
      name,
      dosage,
      quantity,
      instructions,
    }));
    return {
      clinicRx: {
        items: clinicItems,
        notes: clinicItems.length && !compact ? 'Observe the patient for 20 minutes after injections / IV fluids.' : '',
        dispensedAt: dispensed && clinicItems.length ? consultedAt.toISOString() : null,
        dispensedBy: dispensed && clinicItems.length ? 'STF-005' : null,
      },
      storeRx: {
        items: storeItems,
        notes: compact ? '' : 'Purchase from any registered medical store. Complete the full course.',
      },
    };
  }

  function createBill(visit, patient, createdAt, { paymentStatus = 'paid', manualDiscount = 0, compact = false } = {}) {
    const fee = computeConsultationFee(visit.category, settings);
    const meds = visit.clinicRx.items
      .filter((i) => i.dispensed)
      .map((i) => {
        const m = medById[i.medicineId];
        return {
          medicineId: m.id,
          name: m.name,
          unit: m.unit,
          qty: i.dispensedQty,
          unitPrice: m.sellingPrice,
          total: i.dispensedQty * m.sellingPrice,
        };
      });
    const additionalCharges = chance(0.12)
      ? [{ label: pick(['Dressing charges', 'Nebulization charges', 'BP & sugar check', 'ECG']), amount: pick([200, 300, 500]) }]
      : [];
    const pre = computeBillTotals({
      consultationBase: fee.base,
      categoryWaiver: fee.waived,
      medicines: meds,
      additionalCharges,
      discountType: 'amount',
      discountValue: manualDiscount,
    });
    let paid = pre.total;
    if (paymentStatus === 'unpaid') paid = 0;
    if (paymentStatus === 'partial') paid = Math.round(pre.total / 2 / 100) * 100;
    const totals = computeBillTotals({
      consultationBase: fee.base,
      categoryWaiver: fee.waived,
      medicines: meds,
      additionalCharges,
      discountType: 'amount',
      discountValue: manualDiscount,
      amountPaid: paid,
    });
    billSeq += 1;
    const bill = {
      id: `BILL-${String(billSeq).padStart(6, '0')}`,
      receiptNo: `ZC-R${String(createdAt.getFullYear()).slice(2)}-${String(billSeq).padStart(5, '0')}`,
      visitId: visit.id,
      patientId: patient.id,
      tokenNo: visit.tokenNo,
      visitDate: visit.date,
      createdAt: createdAt.toISOString(),
      createdBy: 'STF-006',
      category: visit.category,
      consultationFee: fee.base,
      categoryWaiver: fee.waived,
      consultationNet: fee.fee,
      medicines: meds,
      additionalCharges,
      discount: { type: 'amount', value: manualDiscount, amount: totals.manualDiscount, reason: manualDiscount ? 'Courtesy discount' : '' },
      ...totals,
      paymentMethod: weighted([['cash', 70], ['card', 20], ['other', 10]]),
      paymentRef: '',
      payments: [],
    };
    if (paid > 0 && !compact) bill.payments.push({ amount: paid, method: bill.paymentMethod, at: createdAt.toISOString() });
    bills.push(bill);
    return bill;
  }

  function recordConsumption(visit, at) {
    for (const item of visit.clinicRx.items) {
      if (!item.dispensed) continue;
      movements.push({
        id: '',
        medicineId: item.medicineId,
        type: 'out',
        reason: 'dispensed',
        quantity: item.dispensedQty,
        date: at.toISOString(),
        reference: `Token #${visit.tokenNo} · ${visit.id}`,
        by: 'STF-005',
        note: '',
      });
    }
  }

  function chooseScenario(patient) {
    if (patient.age < 13) return pick([SCENARIOS[12], SCENARIOS[0], SCENARIOS[1], SCENARIOS[3]]);
    return pick(SCENARIOS.slice(0, 12).concat(SCENARIOS[13]));
  }

  function chooseCategory(patient) {
    if (patient.tags.includes('free')) return 'free';
    if (patient.tags.includes('discounted')) return chance(0.8) ? 'discounted' : 'regular';
    return weighted([
      ['regular', 66],
      ['follow_up', 14],
      ['free', 6],
      ['discounted', 7],
      ['no_charge', 4],
    ]);
  }

  const visitTimes = (day, count, isToday) => {
    if (isToday) {
      // Spread today's tokens backwards from "now" so the queue looks live.
      const start = new Date(now.getTime() - count * 11 * 60_000);
      const floor = new Date(day);
      floor.setHours(8, 45, 0, 0);
      const base = start < floor ? floor : start;
      return Array.from({ length: count }, (_, i) => new Date(base.getTime() + i * 11 * 60_000 - between(0, 4) * 60_000));
    }
    const times = [];
    for (let i = 0; i < count; i++) {
      const t = new Date(day);
      if (chance(0.6)) t.setHours(between(9, 13), between(0, 59));
      else t.setHours(between(17, 21), between(0, 59));
      times.push(t);
    }
    return times.sort((a, b) => a - b);
  };

  for (let offset = HISTORY_DAYS; offset >= 0; offset--) {
    const day = addDays(today0, -offset);
    const key = dateKey(day);
    const isToday = offset === 0;
    const isSunday = day.getDay() === 0;
    const trend = Math.round(((HISTORY_DAYS - offset) / HISTORY_DAYS) * 4);
    const count = isToday ? 22 : isSunday ? between(4, 7) : between(8, 15) + trend;
    const times = visitTimes(day, count, isToday);
    const yesterdayPatients = (visitsByDay[dateKey(addDays(day, -1))] || []).map((v) => v.patientId);
    const morningPatients = [];
    const dayVisits = [];

    times.forEach((time, i) => {
      const tokenNo = i + 1;
      const session = time.getHours() < 15 ? 'morning' : 'evening';
      let patient;
      let category;

      if (session === 'evening' && morningPatients.length && chance(0.1)) {
        const pid = pick(morningPatients);
        patient = patients.find((p) => p.id === pid);
        category = 'same_day_follow_up';
      } else if (yesterdayPatients.length && chance(0.08)) {
        const pid = pick(yesterdayPatients);
        patient = patients.find((p) => p.id === pid);
        category = 'next_day_follow_up';
      } else if (chance(isToday ? 0.35 : 0.28)) {
        const reg = new Date(time.getTime() - 3 * 60_000);
        patient = makePatient(reg);
        category = patient.tags.includes('free') ? 'free' : patient.tags.includes('discounted') ? 'discounted' : 'regular';
      } else {
        const pool = patients.filter((p) => new Date(p.registeredAt) < time);
        patient = pick(pool);
        category = chooseCategory(patient);
      }
      if (dayVisits.some((v) => v.patientId === patient.id) && category !== 'same_day_follow_up') {
        // avoid accidental duplicate same-day visits that are not follow-ups
        const pool = patients.filter((p) => new Date(p.registeredAt) < time && !dayVisits.some((v) => v.patientId === p.id));
        patient = pick(pool);
        category = chooseCategory(patient);
      }
      if (session === 'morning') morningPatients.push(patient.id);

      const scenario =
        category === 'same_day_follow_up' || category === 'next_day_follow_up'
          ? { ...chooseScenario(patient), complaint: 'Review after treatment — symptoms improving' }
          : chooseScenario(patient);
      const doctor = session === 'morning' ? (chance(0.7) ? doctors[0] : doctors[1]) : pick(doctors);
      const consultStart = new Date(time.getTime() + between(10, 45) * 60_000);
      const consultEnd = new Date(consultStart.getTime() + between(7, 18) * 60_000);

      const visit = {
        id: `VIS-${key.replace(/-/g, '').slice(2)}-${String(tokenNo).padStart(3, '0')}`,
        patientId: patient.id,
        date: key,
        tokenNo,
        registeredAt: time.toISOString(),
        session,
        category,
        doctorId: doctor.id,
        status: 'completed',
        complaint: scenario.complaint,
        vitals: makeVitals(patient.age),
        consultation: {
          startedAt: consultStart.toISOString(),
          completedAt: consultEnd.toISOString(),
          diagnosis: scenario.diagnosis,
          notes: isToday ? 'Patient examined. Vitals reviewed. Advised rest and adequate hydration.' : '',
          followUpDate: chance(0.3) ? dateKey(addDays(day, pick([1, 3, 7]))) : '',
        },
        ...buildPrescriptions(scenario, consultEnd, true, !isToday),
        billId: null,
        createdBy: session === 'morning' ? 'STF-004' : 'STF-007',
      };

      if (!isToday) {
        if (chance(0.015)) {
          visit.status = 'cancelled';
          visit.consultation = null;
          visit.clinicRx = { items: [], notes: '', dispensedAt: null, dispensedBy: null };
          visit.storeRx = { items: [], notes: '' };
        } else {
          recordConsumption(visit, consultEnd);
          const paymentStatus = offset <= 12 && chance(0.05) ? pick(['unpaid', 'partial']) : 'paid';
          const manual = visit.category === 'regular' && chance(0.05) ? pick([100, 200, 300]) : 0;
          const bill = createBill(visit, patient, new Date(consultEnd.getTime() + between(3, 12) * 60_000), {
            paymentStatus,
            manualDiscount: manual,
            compact: true,
          });
          visit.billId = bill.id;
        }
      }

      dayVisits.push(visit);
      visits.push(visit);
    });

    if (isToday) {
      // Assign a realistic live state to today's queue.
      const n = dayVisits.length;
      dayVisits.forEach((visit, idx) => {
        const patient = patients.find((p) => p.id === visit.patientId);
        const registered = new Date(visit.registeredAt);
        const remaining = n - idx; // 1 = last token
        if (remaining > 12) {
          // completed & billed
          const done = new Date(Math.min(now.getTime() - remaining * 4 * 60_000, registered.getTime() + 35 * 60_000));
          visit.consultation.startedAt = new Date(registered.getTime() + 12 * 60_000).toISOString();
          visit.consultation.completedAt = new Date(registered.getTime() + 24 * 60_000).toISOString();
          visit.clinicRx.dispensedAt = visit.clinicRx.items.length ? visit.consultation.completedAt : null;
          recordConsumption(visit, new Date(visit.consultation.completedAt));
          const bill = createBill(visit, patient, done, { paymentStatus: idx === 3 ? 'partial' : 'paid' });
          visit.billId = bill.id;
          visit.status = 'completed';
        } else if (remaining > 10) {
          // consulted + dispensed, waiting at the billing desk
          visit.consultation.startedAt = new Date(registered.getTime() + 14 * 60_000).toISOString();
          visit.consultation.completedAt = new Date(registered.getTime() + 26 * 60_000).toISOString();
          visit.clinicRx.dispensedAt = visit.clinicRx.items.length ? visit.consultation.completedAt : null;
          recordConsumption(visit, new Date(visit.consultation.completedAt));
          visit.status = 'billing';
        } else if (remaining > 8) {
          // consulted, clinic medicines not dispensed yet
          const sc = SCENARIOS[remaining === 10 ? 1 : 2];
          Object.assign(visit, buildPrescriptions(sc, new Date(), false));
          visit.complaint = visit.category.includes('follow') ? visit.complaint : sc.complaint;
          visit.consultation.diagnosis = sc.diagnosis;
          visit.consultation.startedAt = new Date(registered.getTime() + 15 * 60_000).toISOString();
          visit.consultation.completedAt = new Date(registered.getTime() + 27 * 60_000).toISOString();
          visit.status = 'pharmacy';
        } else if (remaining > 6) {
          // currently with the doctor (one per doctor)
          visit.doctorId = doctors[remaining === 8 ? 0 : 1].id;
          visit.consultation = {
            startedAt: new Date(now.getTime() - between(3, 9) * 60_000).toISOString(),
            completedAt: null,
            diagnosis: '',
            notes: '',
            followUpDate: '',
          };
          visit.clinicRx = { items: [], notes: '', dispensedAt: null, dispensedBy: null };
          visit.storeRx = { items: [], notes: '' };
          visit.status = 'in_consultation';
        } else {
          // waiting in the queue
          visit.doctorId = idx % 3 === 0 ? doctors[1].id : doctors[0].id;
          visit.consultation = null;
          visit.clinicRx = { items: [], notes: '', dispensedAt: null, dispensedBy: null };
          visit.storeRx = { items: [], notes: '' };
          visit.status = 'waiting';
        }
      });
    }

    visitsByDay[key] = dayVisits;
  }

  /* ---------- stock: purchases + adjustments + running balances ---------- */
  const consumedByMed = {};
  for (const m of movements) consumedByMed[m.medicineId] = (consumedByMed[m.medicineId] || 0) + m.quantity;

  const adjustments = [
    ['MED-011', 'adjustment', 'expired', -6, 9, 'Expired bags removed from shelf'],
    ['MED-024', 'adjustment', 'damaged', -10, 31, 'Damaged packaging'],
    ['MED-001', 'adjustment', 'correction', 20, 44, 'Physical count correction'],
    ['MED-013', 'adjustment', 'damaged', -4, 17, 'Broken nebules'],
  ];

  MEDICINE_CATALOG.forEach(([id, , , , , , , , , target]) => {
    const consumed = consumedByMed[id] || 0;
    const adj = adjustments.filter((a) => a[0] === id).reduce((acc, a) => acc + a[3], 0);
    const received = Math.max(0, consumed + target - adj);
    const parts = [Math.round(received * 0.55), Math.round(received * 0.3)];
    parts.push(received - parts[0] - parts[1]);
    const purchaseDays = [HISTORY_DAYS, Math.round(HISTORY_DAYS * 0.63), Math.round(HISTORY_DAYS * 0.23)];
    parts.forEach((qty, i) => {
      if (qty <= 0) return;
      const d = addDays(today0, -purchaseDays[i]);
      d.setHours(10, 15);
      movements.push({
        id: '',
        medicineId: id,
        type: 'in',
        reason: i === 0 ? 'opening' : 'purchase',
        quantity: qty,
        date: d.toISOString(),
        reference: i === 0 ? 'Opening balance' : `Invoice INV-${between(4000, 9999)}`,
        visitId: null,
        by: i === 0 ? 'STF-001' : 'STF-005',
        note: i === 0 ? '' : `Received from ${medById[id].supplier}`,
        unitCost: medById[id].purchasePrice,
      });
    });
  });

  adjustments.forEach(([medicineId, type, reason, qty, daysAgo, note]) => {
    const d = addDays(today0, -Math.min(daysAgo, HISTORY_DAYS - 2));
    d.setHours(18, 30);
    movements.push({
      id: '',
      medicineId,
      type,
      reason,
      quantity: qty,
      date: d.toISOString(),
      reference: 'Stock audit',
      visitId: null,
      by: 'STF-005',
      note,
    });
  });

  movements.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Guarantee the running balance never dips below zero: top up opening stock if needed.
  const running = {};
  const lowest = {};
  for (const m of movements) {
    const delta = m.type === 'out' ? -m.quantity : m.quantity;
    running[m.medicineId] = (running[m.medicineId] || 0) + delta;
    lowest[m.medicineId] = Math.min(lowest[m.medicineId] ?? 0, running[m.medicineId]);
  }
  for (const [medId, low] of Object.entries(lowest)) {
    if (low >= 0) continue;
    const opening = movements.find((m) => m.medicineId === medId && m.reason === 'opening');
    if (opening) opening.quantity += -low + 4;
  }

  const balances = {};
  movements.forEach((m, i) => {
    m.id = `SM-${String(i + 1).padStart(6, '0')}`;
    const delta = m.type === 'in' ? m.quantity : m.type === 'out' ? -m.quantity : m.quantity;
    balances[m.medicineId] = (balances[m.medicineId] || 0) + delta;
    m.balanceAfter = balances[m.medicineId];
    const med = medById[m.medicineId];
    if (m.type === 'in') med.totalReceived += m.quantity;
    else if (m.type === 'out') med.totalConsumed += m.quantity;
    else med.totalAdjusted += m.quantity;
  });
  medicines.forEach((m) => {
    m.currentStock = balances[m.id] || 0;
  });

  /* ---------- activity feed ---------- */
  const activities = [];
  const pName = (id) => patients.find((p) => p.id === id)?.name || 'Patient';
  const dName = (id) => staff.find((s) => s.id === id)?.name || 'Doctor';
  for (const v of visitsByDay[dateKey(today0)]) {
    activities.push({
      id: uid('ACT'),
      type: 'token',
      message: `Token #${v.tokenNo} issued to ${pName(v.patientId)}`,
      at: v.registeredAt,
      by: 'STF-004',
    });
    if (v.consultation?.completedAt) {
      activities.push({
        id: uid('ACT'),
        type: 'consultation',
        message: `${dName(v.doctorId)} completed consultation for ${pName(v.patientId)}`,
        at: v.consultation.completedAt,
        by: v.doctorId,
      });
    }
    if (v.clinicRx.dispensedAt && v.clinicRx.items.length) {
      activities.push({
        id: uid('ACT'),
        type: 'dispense',
        message: `Clinic medicines dispensed for Token #${v.tokenNo}`,
        at: new Date(new Date(v.clinicRx.dispensedAt).getTime() + 2 * 60_000).toISOString(),
        by: 'STF-005',
      });
    }
    if (v.billId) {
      const b = bills.find((x) => x.id === v.billId);
      activities.push({
        id: uid('ACT'),
        type: 'bill',
        message: `Receipt ${b.receiptNo} — ${settings.fees.currency} ${b.amountPaid.toLocaleString()} received (${b.paymentMethod})`,
        at: b.createdAt,
        by: 'STF-006',
      });
    }
  }
  const lastPurchase = [...movements].reverse().find((m) => m.reason === 'purchase');
  if (lastPurchase) {
    activities.push({
      id: uid('ACT'),
      type: 'stock',
      message: `Stock received: ${medById[lastPurchase.medicineId].name} +${lastPurchase.quantity}`,
      at: lastPurchase.date,
      by: 'STF-005',
    });
  }
  activities.sort((a, b) => new Date(b.at) - new Date(a.at));

  return {
    version: SEED_VERSION,
    seededOn: dateKey(now),
    historyDays: HISTORY_DAYS,
    settings,
    roles,
    staff,
    patients,
    visits,
    bills,
    medicines,
    movements,
    activities: activities.slice(0, 60),
    counters: {
      patient: patientSeq,
      bill: billSeq,
      movement: movements.length,
      uid: uidCounter,
    },
  };
}
