import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createSeed, SEED_VERSION } from '@/data/seed';
import { computeBillTotals, computeConsultationFee } from '@/utils/billing';
import { sessionFor, todayKey } from '@/utils/format';
import config from '@/config';

/**
 * Frontend-only data store.
 * - State lives in React and is mirrored to localStorage (no backend, no API).
 * - Mock data is regenerated on a new calendar day (VITE_DEMO_AUTO_RESET_DAILY)
 *   so the "today" views always look alive. Use Settings → Demo data to reset manually.
 */

const STORAGE_KEY = `${config.storagePrefix}:data`;
const DataContext = createContext(null);

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const fresh = !config.demoAutoResetDaily || parsed?.seededOn === todayKey();
      if (parsed?.version === SEED_VERSION && parsed?.historyDays === config.demoHistoryDays && fresh) return parsed;
    }
  } catch {
    /* ignore corrupt storage */
  }
  return createSeed(new Date());
}

const nowISO = () => new Date().toISOString();

export function DataProvider({ children }) {
  const [state, setState] = useState(loadInitial);
  const ref = useRef(state);
  const saveTimer = useRef(null);
  const skipNextSave = useRef(false);

  const commit = useCallback((updater) => {
    const next = typeof updater === 'function' ? updater(ref.current) : updater;
    ref.current = next;
    setState(next);
    return next;
  }, []);

  /* Persist (debounced, flushed on page hide / unmount so no action is lost) */
  const dirty = useRef(false);
  const persist = useCallback(() => {
    clearTimeout(saveTimer.current);
    if (!dirty.current) return;
    dirty.current = false;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ref.current));
    } catch (err) {
      console.warn('[Zaib Clinic] Could not persist demo data:', err);
    }
  }, []);

  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    dirty.current = true;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(persist, 350);
  }, [state, persist]);

  useEffect(() => {
    window.addEventListener('pagehide', persist);
    return () => {
      window.removeEventListener('pagehide', persist);
      persist();
    };
  }, [persist]);

  /* Cross-tab sync (e.g. the waiting-room token display in another tab) */
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        const next = JSON.parse(e.newValue);
        skipNextSave.current = true;
        ref.current = next;
        setState(next);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  /* --------------------------- helpers --------------------------- */

  const nextUid = (s, prefix) => {
    const n = (s.counters.uid || 0) + 1;
    return [`${prefix}-${n.toString(36).toUpperCase().padStart(5, '0')}`, n];
  };

  const withActivity = (s, message, type, by) => {
    const [id, n] = nextUid(s, 'ACT');
    return {
      ...s,
      counters: { ...s.counters, uid: n },
      activities: [{ id, type, message, at: nowISO(), by }, ...s.activities].slice(0, 80),
    };
  };

  /* ----------------------------- API ----------------------------- */

  const api = useMemo(
    () => ({
      /* ---------- Patients ---------- */
      addPatient(values, userId) {
        const s = ref.current;
        const seq = s.counters.patient + 1;
        const patient = {
          id: `ZC-${seq}`,
          name: values.name.trim(),
          phone: values.phone.trim(),
          age: Number(values.age),
          gender: values.gender,
          address: values.address.trim(),
          bloodGroup: values.bloodGroup || '',
          registeredAt: values.registeredAt ? new Date(values.registeredAt).toISOString() : nowISO(),
          tags: values.tags?.length ? values.tags : ['regular'],
          notes: values.notes || '',
        };
        commit((prev) =>
          withActivity(
            { ...prev, patients: [patient, ...prev.patients], counters: { ...prev.counters, patient: seq } },
            `New patient registered: ${patient.name} (${patient.id})`,
            'patient',
            userId,
          ),
        );
        return patient;
      },

      updatePatient(id, values, userId) {
        commit((prev) =>
          withActivity(
            {
              ...prev,
              patients: prev.patients.map((p) =>
                p.id === id ? { ...p, ...values, age: Number(values.age ?? p.age) } : p,
              ),
            },
            `Patient record updated: ${values.name || id}`,
            'patient',
            userId,
          ),
        );
      },

      /* ---------- Tokens & queue ---------- */
      issueToken({ patientId, category, session, doctorId, complaint, vitals }, userId) {
        const s = ref.current;
        const today = todayKey();
        const todays = s.visits.filter((v) => v.date === today);
        const tokenNo = todays.reduce((m, v) => Math.max(m, v.tokenNo), 0) + 1;
        const now = nowISO();
        const visit = {
          id: `VIS-${today.replace(/-/g, '').slice(2)}-${String(tokenNo).padStart(3, '0')}`,
          patientId,
          date: today,
          tokenNo,
          registeredAt: now,
          session: session || sessionFor(now),
          category: category || 'regular',
          doctorId: doctorId || '',
          status: 'waiting',
          complaint: complaint || '',
          vitals: vitals || { bp: '', pulse: '', temp: '', weight: '', spo2: '' },
          consultation: null,
          clinicRx: { items: [], notes: '', dispensedAt: null, dispensedBy: null },
          storeRx: { items: [], notes: '' },
          billId: null,
          createdBy: userId,
        };
        const patient = s.patients.find((p) => p.id === patientId);
        commit((prev) =>
          withActivity(
            { ...prev, visits: [...prev.visits, visit] },
            `Token #${tokenNo} issued to ${patient?.name || patientId}`,
            'token',
            userId,
          ),
        );
        return visit;
      },

      updateVisit(id, patch) {
        commit((prev) => ({
          ...prev,
          visits: prev.visits.map((v) => (v.id === id ? { ...v, ...patch } : v)),
        }));
      },

      cancelVisit(id, userId) {
        const v = ref.current.visits.find((x) => x.id === id);
        commit((prev) =>
          withActivity(
            { ...prev, visits: prev.visits.map((x) => (x.id === id ? { ...x, status: 'cancelled' } : x)) },
            `Token #${v?.tokenNo} cancelled`,
            'token',
            userId,
          ),
        );
      },

      startConsultation(visitId, doctorId, userId) {
        const s = ref.current;
        const v = s.visits.find((x) => x.id === visitId);
        if (!v) return;
        const patient = s.patients.find((p) => p.id === v.patientId);
        const doctor = s.staff.find((d) => d.id === (doctorId || v.doctorId));
        commit((prev) =>
          withActivity(
            {
              ...prev,
              visits: prev.visits.map((x) =>
                x.id === visitId
                  ? {
                      ...x,
                      doctorId: doctorId || x.doctorId,
                      status: 'in_consultation',
                      consultation: x.consultation || {
                        startedAt: nowISO(),
                        completedAt: null,
                        diagnosis: '',
                        notes: '',
                        followUpDate: '',
                      },
                    }
                  : x,
              ),
            },
            `Token #${v.tokenNo} (${patient?.name}) called in by ${doctor?.name || 'doctor'}`,
            'consultation',
            userId,
          ),
        );
      },

      /** Save the doctor's work. When `complete` is true the patient moves to the next step. */
      saveConsultation(visitId, data, { complete = false } = {}, userId) {
        const s = ref.current;
        const v = s.visits.find((x) => x.id === visitId);
        if (!v) return null;
        const patient = s.patients.find((p) => p.id === v.patientId);
        let n = s.counters.uid || 0;
        const itemId = () => `RXI-${(++n).toString(36).toUpperCase().padStart(5, '0')}`;
        const medName = (id) => s.medicines.find((m) => m.id === id)?.name || '';

        const clinicItems = (data.clinicItems || []).map((i) => ({
          id: i.id || itemId(),
          medicineId: i.medicineId,
          name: medName(i.medicineId),
          dosage: i.dosage,
          quantity: Number(i.quantity) || 0,
          instructions: i.instructions,
          dispensed: false,
          dispensedQty: 0,
        }));
        const storeItems = (data.storeItems || []).map((i) => ({
          id: i.id || itemId(),
          name: i.name,
          dosage: i.dosage,
          quantity: i.quantity,
          instructions: i.instructions,
        }));
        const nextStatus = complete ? (clinicItems.length ? 'pharmacy' : 'billing') : v.status;

        const updated = {
          ...v,
          category: data.category || v.category,
          complaint: data.complaint ?? v.complaint,
          vitals: data.vitals || v.vitals,
          status: nextStatus,
          consultation: {
            ...(v.consultation || { startedAt: nowISO() }),
            diagnosis: data.diagnosis,
            notes: data.notes,
            followUpDate: data.followUpDate || '',
            completedAt: complete ? nowISO() : v.consultation?.completedAt || null,
          },
          clinicRx: { items: clinicItems, notes: data.clinicNotes || '', dispensedAt: null, dispensedBy: null },
          storeRx: { items: storeItems, notes: data.storeNotes || '' },
        };

        commit((prev) => {
          const base = {
            ...prev,
            counters: { ...prev.counters, uid: n },
            visits: prev.visits.map((x) => (x.id === visitId ? updated : x)),
          };
          return complete
            ? withActivity(
                base,
                `Consultation completed for ${patient?.name} — ${clinicItems.length} clinic & ${storeItems.length} store medicine(s) prescribed`,
                'consultation',
                userId,
              )
            : base;
        });
        return updated;
      },

      /**
       * Dispense / administer clinic-prescription medicines.
       * Stock is deducted ONLY here — never when the prescription is written.
       * selections: [{ itemId, give: boolean, qty }]
       */
      dispense(visitId, selections, userId) {
        const s = ref.current;
        const v = s.visits.find((x) => x.id === visitId);
        if (!v) return { ok: false, error: 'Visit not found' };
        const patient = s.patients.find((p) => p.id === v.patientId);
        const selMap = Object.fromEntries(selections.map((x) => [x.itemId, x]));

        // validate stock
        for (const item of v.clinicRx.items) {
          const sel = selMap[item.id];
          if (!sel?.give) continue;
          const med = s.medicines.find((m) => m.id === item.medicineId);
          if (!med || med.currentStock < Number(sel.qty)) {
            return { ok: false, error: `Insufficient stock for ${item.name}` };
          }
        }

        let mvSeq = s.counters.movement;
        const at = nowISO();
        const newMovements = [];
        const medicines = s.medicines.map((m) => ({ ...m }));
        const items = v.clinicRx.items.map((item) => {
          const sel = selMap[item.id];
          if (!sel?.give || !(Number(sel.qty) > 0)) {
            return { ...item, dispensed: false, dispensedQty: 0, declined: true };
          }
          const qty = Number(sel.qty);
          const med = medicines.find((m) => m.id === item.medicineId);
          med.currentStock -= qty;
          med.totalConsumed += qty;
          mvSeq += 1;
          newMovements.push({
            id: `SM-${String(mvSeq).padStart(6, '0')}`,
            medicineId: med.id,
            type: 'out',
            reason: 'dispensed',
            quantity: qty,
            date: at,
            reference: `Token #${v.tokenNo} · ${v.id}`,
            visitId: v.id,
            by: userId,
            note: patient?.name || '',
            balanceAfter: med.currentStock,
          });
          return { ...item, dispensed: true, dispensedQty: qty, declined: false };
        });

        commit((prev) =>
          withActivity(
            {
              ...prev,
              medicines,
              movements: [...prev.movements, ...newMovements],
              counters: { ...prev.counters, movement: mvSeq },
              visits: prev.visits.map((x) =>
                x.id === visitId
                  ? {
                      ...x,
                      status: 'billing',
                      clinicRx: { ...x.clinicRx, items, dispensedAt: at, dispensedBy: userId },
                    }
                  : x,
              ),
            },
            newMovements.length
              ? `Dispensed ${newMovements.length} clinic medicine(s) for Token #${v.tokenNo} (${patient?.name})`
              : `Token #${v.tokenNo} sent to billing — no clinic medicines dispensed`,
            'dispense',
            userId,
          ),
        );
        return { ok: true, count: newMovements.length };
      },

      /* ---------- Billing ---------- */
      createBill(visitId, form, userId) {
        const s = ref.current;
        const v = s.visits.find((x) => x.id === visitId);
        if (!v) return null;
        const patient = s.patients.find((p) => p.id === v.patientId);
        const fee = computeConsultationFee(form.category || v.category, s.settings);
        const consultationBase = fee.base;
        const categoryWaiver = form.waiveConsultation ? fee.base : fee.waived;
        const totals = computeBillTotals({
          consultationBase,
          categoryWaiver,
          medicines: form.medicines,
          additionalCharges: form.additionalCharges,
          discountType: form.discountType,
          discountValue: form.discountValue,
          amountPaid: form.amountPaid,
        });
        const seq = s.counters.bill + 1;
        const at = nowISO();
        const bill = {
          id: `BILL-${String(seq).padStart(6, '0')}`,
          receiptNo: `ZC-R${String(new Date().getFullYear()).slice(2)}-${String(seq).padStart(5, '0')}`,
          visitId: v.id,
          patientId: v.patientId,
          tokenNo: v.tokenNo,
          visitDate: v.date,
          createdAt: at,
          createdBy: userId,
          category: form.category || v.category,
          consultationFee: consultationBase,
          categoryWaiver,
          consultationNet: consultationBase - categoryWaiver,
          medicines: form.medicines,
          additionalCharges: form.additionalCharges.filter((c) => c.label && Number(c.amount)),
          discount: {
            type: form.discountType,
            value: Number(form.discountValue) || 0,
            amount: totals.manualDiscount,
            reason: form.discountReason || '',
          },
          ...totals,
          paymentMethod: form.paymentMethod,
          paymentRef: form.paymentRef || '',
          payments: totals.amountPaid > 0 ? [{ amount: totals.amountPaid, method: form.paymentMethod, at }] : [],
        };
        commit((prev) =>
          withActivity(
            {
              ...prev,
              bills: [...prev.bills, bill],
              counters: { ...prev.counters, bill: seq },
              visits: prev.visits.map((x) =>
                x.id === visitId ? { ...x, status: 'completed', billId: bill.id, category: bill.category } : x,
              ),
            },
            `Receipt ${bill.receiptNo} — ${s.settings.fees.currency} ${bill.amountPaid.toLocaleString()} received from ${patient?.name} (${bill.paymentMethod})`,
            'bill',
            userId,
          ),
        );
        return bill;
      },

      recordPayment(billId, { amount, method }, userId) {
        const s = ref.current;
        const b = s.bills.find((x) => x.id === billId);
        if (!b) return null;
        const pay = Math.min(Number(amount) || 0, b.balance);
        const amountPaid = b.amountPaid + pay;
        const balance = Math.max(0, b.total - amountPaid);
        const updated = {
          ...b,
          amountPaid,
          balance,
          paymentStatus: balance === 0 ? 'paid' : amountPaid > 0 ? 'partial' : 'unpaid',
          paymentMethod: method || b.paymentMethod,
          payments: [...(b.payments || []), { amount: pay, method, at: nowISO() }],
        };
        commit((prev) =>
          withActivity(
            { ...prev, bills: prev.bills.map((x) => (x.id === billId ? updated : x)) },
            `Payment of ${s.settings.fees.currency} ${pay.toLocaleString()} collected on ${b.receiptNo}`,
            'bill',
            userId,
          ),
        );
        return updated;
      },

      /* ---------- Inventory ---------- */
      addMedicine(values, userId) {
        const s = ref.current;
        const num = s.medicines.reduce((m, x) => Math.max(m, Number(x.id.split('-')[1]) || 0), 0) + 1;
        const id = `MED-${String(num).padStart(3, '0')}`;
        const opening = Number(values.currentStock) || 0;
        const mvSeq = s.counters.movement + (opening > 0 ? 1 : 0);
        const med = {
          id,
          name: values.name.trim(),
          genericName: values.genericName?.trim() || '',
          category: values.category,
          unit: values.unit,
          purchasePrice: Number(values.purchasePrice) || 0,
          sellingPrice: Number(values.sellingPrice) || 0,
          supplier: values.supplier,
          minStock: Number(values.minStock) || 0,
          currentStock: opening,
          totalReceived: opening,
          totalConsumed: 0,
          totalAdjusted: 0,
          batchNo: values.batchNo,
          expiryDate: values.expiryDate,
          entryDate: values.entryDate || todayKey(),
          notes: values.notes || '',
        };
        const mv =
          opening > 0
            ? [
                {
                  id: `SM-${String(mvSeq).padStart(6, '0')}`,
                  medicineId: id,
                  type: 'in',
                  reason: 'opening',
                  quantity: opening,
                  date: nowISO(),
                  reference: `Batch ${values.batchNo}`,
                  visitId: null,
                  by: userId,
                  note: 'Opening stock on medicine entry',
                  balanceAfter: opening,
                  unitCost: med.purchasePrice,
                },
              ]
            : [];
        commit((prev) =>
          withActivity(
            {
              ...prev,
              medicines: [...prev.medicines, med],
              movements: [...prev.movements, ...mv],
              counters: { ...prev.counters, movement: mvSeq },
            },
            `New medicine added: ${med.name} (opening stock ${opening})`,
            'stock',
            userId,
          ),
        );
        return med;
      },

      updateMedicine(id, values, userId) {
        commit((prev) =>
          withActivity(
            {
              ...prev,
              medicines: prev.medicines.map((m) =>
                m.id === id
                  ? {
                      ...m,
                      ...values,
                      currentStock: m.currentStock, // stock only changes through movements
                      purchasePrice: Number(values.purchasePrice),
                      sellingPrice: Number(values.sellingPrice),
                      minStock: Number(values.minStock),
                    }
                  : m,
              ),
            },
            `Medicine details updated: ${values.name}`,
            'stock',
            userId,
          ),
        );
      },

      stockIn(medicineId, values, userId) {
        const s = ref.current;
        const med = s.medicines.find((m) => m.id === medicineId);
        if (!med) return;
        const qty = Number(values.quantity) || 0;
        const mvSeq = s.counters.movement + 1;
        const balance = med.currentStock + qty;
        commit((prev) =>
          withActivity(
            {
              ...prev,
              counters: { ...prev.counters, movement: mvSeq },
              medicines: prev.medicines.map((m) =>
                m.id === medicineId
                  ? {
                      ...m,
                      currentStock: balance,
                      totalReceived: m.totalReceived + qty,
                      batchNo: values.batchNo || m.batchNo,
                      expiryDate: values.expiryDate || m.expiryDate,
                      purchasePrice: Number(values.unitCost) || m.purchasePrice,
                      supplier: values.supplier || m.supplier,
                    }
                  : m,
              ),
              movements: [
                ...prev.movements,
                {
                  id: `SM-${String(mvSeq).padStart(6, '0')}`,
                  medicineId,
                  type: 'in',
                  reason: 'purchase',
                  quantity: qty,
                  date: values.date ? new Date(values.date).toISOString() : nowISO(),
                  reference: values.reference || 'Purchase',
                  visitId: null,
                  by: userId,
                  note: values.note || `Batch ${values.batchNo || med.batchNo}`,
                  balanceAfter: balance,
                  unitCost: Number(values.unitCost) || med.purchasePrice,
                },
              ],
            },
            `Stock received: ${med.name} +${qty}`,
            'stock',
            userId,
          ),
        );
      },

      /** direction: 'out' removes stock (expired, damaged...), 'in' adds (correction). */
      stockAdjust(medicineId, { direction, reason, quantity, note }, userId) {
        const s = ref.current;
        const med = s.medicines.find((m) => m.id === medicineId);
        if (!med) return;
        const qty = Math.abs(Number(quantity) || 0);
        const delta = direction === 'out' ? -qty : qty;
        const balance = med.currentStock + delta;
        const mvSeq = s.counters.movement + 1;
        commit((prev) =>
          withActivity(
            {
              ...prev,
              counters: { ...prev.counters, movement: mvSeq },
              medicines: prev.medicines.map((m) =>
                m.id === medicineId ? { ...m, currentStock: balance, totalAdjusted: m.totalAdjusted + delta } : m,
              ),
              movements: [
                ...prev.movements,
                {
                  id: `SM-${String(mvSeq).padStart(6, '0')}`,
                  medicineId,
                  type: 'adjustment',
                  reason,
                  quantity: delta,
                  date: nowISO(),
                  reference: 'Manual adjustment',
                  visitId: null,
                  by: userId,
                  note,
                  balanceAfter: balance,
                },
              ],
            },
            `Stock adjusted: ${med.name} ${delta > 0 ? '+' : ''}${delta} (${reason})`,
            'stock',
            userId,
          ),
        );
      },

      /* ---------- Staff & roles ---------- */
      addStaff(values, userId) {
        const s = ref.current;
        const num = s.staff.reduce((m, x) => Math.max(m, Number(x.id.split('-')[1]) || 0), 0) + 1;
        const member = {
          id: `STF-${String(num).padStart(3, '0')}`,
          name: values.name.trim(),
          email: values.email.trim().toLowerCase(),
          password: values.password,
          role: values.role,
          designation: values.designation,
          phone: values.phone,
          room: values.room || '',
          status: values.status || 'active',
          joinedAt: values.joinedAt || todayKey(),
        };
        commit((prev) =>
          withActivity(
            { ...prev, staff: [...prev.staff, member] },
            `Staff member added: ${member.name} (${prev.roles[member.role]?.label})`,
            'staff',
            userId,
          ),
        );
        return member;
      },

      updateStaff(id, values, userId) {
        commit((prev) =>
          withActivity(
            {
              ...prev,
              staff: prev.staff.map((m) =>
                m.id === id
                  ? { ...m, ...values, password: values.password ? values.password : m.password, email: (values.email || m.email).toLowerCase() }
                  : m,
              ),
            },
            `Staff profile updated: ${values.name}`,
            'staff',
            userId,
          ),
        );
      },

      setStaffStatus(id, status, userId) {
        const m = ref.current.staff.find((x) => x.id === id);
        commit((prev) =>
          withActivity(
            { ...prev, staff: prev.staff.map((x) => (x.id === id ? { ...x, status } : x)) },
            `${m?.name} ${status === 'active' ? 'activated' : 'deactivated'}`,
            'staff',
            userId,
          ),
        );
      },

      updateRolePermissions(roleId, permissions, userId) {
        commit((prev) =>
          withActivity(
            { ...prev, roles: { ...prev.roles, [roleId]: { ...prev.roles[roleId], permissions } } },
            `Permissions updated for role: ${prev.roles[roleId]?.label}`,
            'staff',
            userId,
          ),
        );
      },

      /* ---------- Settings ---------- */
      updateSettings(section, values, userId) {
        commit((prev) =>
          withActivity(
            {
              ...prev,
              settings: {
                ...prev.settings,
                [section]:
                  values && typeof values === 'object' && !Array.isArray(values)
                    ? { ...prev.settings[section], ...values }
                    : values,
              },
            },
            `Settings updated: ${section}`,
            'settings',
            userId,
          ),
        );
      },

      setLogo(dataUrl, userId) {
        commit((prev) =>
          withActivity(
            { ...prev, settings: { ...prev.settings, logo: dataUrl } },
            dataUrl ? 'Clinic logo updated' : 'Clinic logo reset to default',
            'settings',
            userId,
          ),
        );
      },

      resetDemo() {
        commit(createSeed(new Date()));
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /* -------------------- memoised lookups ------------------------- */
  const lookup = useMemo(
    () => ({
      patient: Object.fromEntries(state.patients.map((p) => [p.id, p])),
      staff: Object.fromEntries(state.staff.map((p) => [p.id, p])),
      medicine: Object.fromEntries(state.medicines.map((p) => [p.id, p])),
      bill: Object.fromEntries(state.bills.map((b) => [b.id, b])),
      visit: Object.fromEntries(state.visits.map((v) => [v.id, v])),
    }),
    [state.patients, state.staff, state.medicines, state.bills, state.visits],
  );

  const doctors = useMemo(
    () => state.staff.filter((s) => s.role === 'doctor' && s.status === 'active'),
    [state.staff],
  );

  const today = todayKey();
  const todayVisits = useMemo(
    () => state.visits.filter((v) => v.date === today).sort((a, b) => a.tokenNo - b.tokenNo),
    [state.visits, today],
  );

  const value = useMemo(
    () => ({ state, api, lookup, doctors, todayVisits, today }),
    [state, api, lookup, doctors, todayVisits, today],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside <DataProvider>');
  return ctx;
}

