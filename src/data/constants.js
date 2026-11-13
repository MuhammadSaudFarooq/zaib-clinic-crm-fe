/**
 * Static domain constants for Zaib Clinic.
 * Everything here is frontend-only reference data.
 */

/* ------------------------------------------------------------------ */
/* Patient categories & tags                                          */
/* ------------------------------------------------------------------ */

/**
 * kind:
 *  - "billing": affects the consultation fee (one per visit)
 *  - "session": informational visit-session tag (morning / evening)
 */
export const CATEGORIES = {
  regular: {
    id: 'regular',
    label: 'Regular Patient',
    short: 'Regular',
    kind: 'billing',
    icon: 'user',
    bg: '#e3edfd',
    fg: '#1d4ea3',
    dot: '#2a78d6',
  },
  free: {
    id: 'free',
    label: 'Free Patient',
    short: 'Free',
    kind: 'billing',
    icon: 'heart',
    bg: '#dcf5e3',
    fg: '#17673a',
    dot: '#1f9d55',
  },
  follow_up: {
    id: 'follow_up',
    label: 'Follow-up',
    short: 'Follow-up',
    kind: 'billing',
    icon: 'repeat',
    bg: '#fdf0cf',
    fg: '#8a4b06',
    dot: '#e09a0b',
  },
  same_day_follow_up: {
    id: 'same_day_follow_up',
    label: 'Same-Day Follow-up',
    short: 'Same-Day F/U',
    kind: 'billing',
    icon: 'clock',
    bg: '#ffe6d5',
    fg: '#9a3412',
    dot: '#ea6a2a',
  },
  next_day_follow_up: {
    id: 'next_day_follow_up',
    label: 'Next-Day Follow-up',
    short: 'Next-Day F/U',
    kind: 'billing',
    icon: 'calendar',
    bg: '#efe5fd',
    fg: '#6328a8',
    dot: '#8b5cf6',
  },
  discounted: {
    id: 'discounted',
    label: 'Discounted Patient',
    short: 'Discounted',
    kind: 'billing',
    icon: 'percent',
    bg: '#fde4f0',
    fg: '#9d1c55',
    dot: '#e0538f',
  },
  no_charge: {
    id: 'no_charge',
    label: 'No-Charge Visit',
    short: 'No-Charge',
    kind: 'billing',
    icon: 'ban',
    bg: '#d3f4ef',
    fg: '#0f5f58',
    dot: '#14a394',
  },
  morning: {
    id: 'morning',
    label: 'Morning Visit',
    short: 'Morning',
    kind: 'session',
    icon: 'sun',
    bg: '#fff6cc',
    fg: '#7a5a00',
    dot: '#e7b416',
  },
  evening: {
    id: 'evening',
    label: 'Evening Visit',
    short: 'Evening',
    kind: 'session',
    icon: 'moon',
    bg: '#e2e5fb',
    fg: '#33378f',
    dot: '#5b61d6',
  },
};

export const BILLING_CATEGORY_IDS = Object.values(CATEGORIES)
  .filter((c) => c.kind === 'billing')
  .map((c) => c.id);

export const SESSION_TAG_IDS = ['morning', 'evening'];

export const ALL_TAG_IDS = Object.keys(CATEGORIES);

/* ------------------------------------------------------------------ */
/* Visit workflow                                                     */
/* ------------------------------------------------------------------ */

export const VISIT_STATUS = {
  waiting: { id: 'waiting', label: 'Waiting', tone: 'amber', step: 1 },
  in_consultation: { id: 'in_consultation', label: 'In Consultation', tone: 'blue', step: 2 },
  pharmacy: { id: 'pharmacy', label: 'Awaiting Dispensing', tone: 'violet', step: 3 },
  billing: { id: 'billing', label: 'Awaiting Billing', tone: 'pink', step: 4 },
  completed: { id: 'completed', label: 'Completed', tone: 'green', step: 5 },
  cancelled: { id: 'cancelled', label: 'Cancelled', tone: 'gray', step: 0 },
};

export const WORKFLOW_STEPS = [
  { id: 'registered', label: 'Registered' },
  { id: 'waiting', label: 'Token & Queue' },
  { id: 'in_consultation', label: 'Consultation' },
  { id: 'prescriptions', label: 'Prescriptions' },
  { id: 'pharmacy', label: 'Dispensing' },
  { id: 'billing', label: 'Billing' },
  { id: 'completed', label: 'Receipt' },
];

/* ------------------------------------------------------------------ */
/* Billing                                                            */
/* ------------------------------------------------------------------ */

export const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'card', label: 'Card' },
  { id: 'other', label: 'Other (Bank / Wallet)' },
];

export const PAYMENT_STATUS = {
  paid: { id: 'paid', label: 'Paid', tone: 'green' },
  partial: { id: 'partial', label: 'Partially Paid', tone: 'amber' },
  unpaid: { id: 'unpaid', label: 'Unpaid', tone: 'red' },
};

/* ------------------------------------------------------------------ */
/* Roles & permissions                                                */
/* ------------------------------------------------------------------ */

export const PERMISSION_GROUPS = [
  {
    module: 'Dashboard',
    items: [{ key: 'dashboard.view', label: 'View dashboard' }],
  },
  {
    module: 'Patients',
    items: [
      { key: 'patients.view', label: 'View patients' },
      { key: 'patients.create', label: 'Register patients' },
      { key: 'patients.edit', label: 'Edit patients' },
    ],
  },
  {
    module: 'Tokens & Queue',
    items: [
      { key: 'queue.view', label: 'View queue' },
      { key: 'queue.manage', label: 'Issue tokens & manage queue' },
    ],
  },
  {
    module: 'Consultation',
    items: [{ key: 'consultation.perform', label: 'Perform consultations & prescribe' }],
  },
  {
    module: 'Pharmacy',
    items: [{ key: 'pharmacy.dispense', label: 'Dispense / administer clinic medicines' }],
  },
  {
    module: 'Billing',
    items: [
      { key: 'billing.view', label: 'View bills' },
      { key: 'billing.create', label: 'Create bills & collect payment' },
      { key: 'billing.discount', label: 'Apply manual discounts' },
    ],
  },
  {
    module: 'Inventory',
    items: [
      { key: 'inventory.view', label: 'View inventory' },
      { key: 'inventory.manage', label: 'Add medicines & adjust stock' },
    ],
  },
  {
    module: 'Reports',
    items: [{ key: 'reports.view', label: 'View reports & analytics' }],
  },
  {
    module: 'Administration',
    items: [
      { key: 'staff.manage', label: 'Manage staff & roles' },
      { key: 'settings.manage', label: 'Manage clinic settings' },
    ],
  },
];

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.key));

export const DEFAULT_ROLES = {
  admin: {
    id: 'admin',
    label: 'Administrator',
    description: 'Full control over every module, user and setting.',
    locked: true,
    permissions: [...ALL_PERMISSIONS],
  },
  doctor: {
    id: 'doctor',
    label: 'Doctor',
    description: 'Consults patients and writes clinic & medical-store prescriptions.',
    permissions: [
      'dashboard.view',
      'patients.view',
      'queue.view',
      'consultation.perform',
      'inventory.view',
      'reports.view',
    ],
  },
  receptionist: {
    id: 'receptionist',
    label: 'Receptionist',
    description: 'Registers patients, issues tokens, manages the queue and billing desk.',
    permissions: [
      'dashboard.view',
      'patients.view',
      'patients.create',
      'patients.edit',
      'queue.view',
      'queue.manage',
      'billing.view',
      'billing.create',
    ],
  },
  pharmacist: {
    id: 'pharmacist',
    label: 'Pharmacist / Nurse',
    description: 'Dispenses and administers clinic medicines, manages stock.',
    permissions: [
      'dashboard.view',
      'patients.view',
      'queue.view',
      'pharmacy.dispense',
      'inventory.view',
      'inventory.manage',
    ],
  },
  cashier: {
    id: 'cashier',
    label: 'Cashier / Accounts',
    description: 'Finalises bills, collects payments and reviews financial reports.',
    permissions: [
      'dashboard.view',
      'patients.view',
      'queue.view',
      'billing.view',
      'billing.create',
      'billing.discount',
      'reports.view',
    ],
  },
};

/* ------------------------------------------------------------------ */
/* Inventory                                                          */
/* ------------------------------------------------------------------ */

export const MEDICINE_CATEGORIES = [
  'Analgesic',
  'NSAID',
  'Antibiotic',
  'Gastrointestinal',
  'Antiallergic',
  'Respiratory',
  'Cough & Cold',
  'Rehydration',
  'IV Fluids',
  'Steroid',
  'Vitamins',
  'Antidiabetic',
  'Cardiovascular',
  'Topical',
  'Consumables',
];

export const MEDICINE_UNITS = [
  'Tablet',
  'Capsule',
  'Bottle',
  'Ampoule',
  'Vial',
  'IV Bag',
  'Tube',
  'Sachet',
  'Inhaler',
  'Piece',
];

export const SUPPLIERS = [
  'Al-Shifa Pharma Distributors',
  'MediLink Traders',
  'Care Plus Distribution',
  'Hilal Medical Supplies',
];

export const STOCK_MOVEMENT_TYPES = {
  in: { id: 'in', label: 'Stock In', tone: 'green' },
  out: { id: 'out', label: 'Stock Out', tone: 'red' },
  adjustment: { id: 'adjustment', label: 'Adjustment', tone: 'amber' },
};

export const STOCK_REASONS = {
  purchase: 'Purchase received',
  dispensed: 'Dispensed / administered',
  expired: 'Expired — removed',
  damaged: 'Damaged / broken',
  returned: 'Returned to supplier',
  correction: 'Stock count correction',
  opening: 'Opening stock',
};

export const GENDERS = ['Male', 'Female', 'Other'];

export const COMMON_INSTRUCTIONS = [
  'After meals',
  'Before meals',
  'At bedtime',
  'With plenty of water',
  'IV — slow infusion',
  'IM — single dose',
  'Apply on affected area',
  'If needed for pain/fever',
];
