/**
 * Static catalog data used by the seed generator.
 */

export const MEDICINE_CATALOG = [
  // id, name, generic, category, unit, purchase, selling, supplier idx, min, target stock, expiry offset (days), batch
  ['MED-001', 'Panadol 500mg', 'Paracetamol', 'Analgesic', 'Tablet', 2, 4, 0, 200, 860, 410],
  ['MED-002', 'Brufen 400mg', 'Ibuprofen', 'NSAID', 'Tablet', 4, 7, 0, 150, 520, 380],
  ['MED-003', 'Augmentin 625mg', 'Amoxicillin + Clavulanate', 'Antibiotic', 'Tablet', 38, 52, 1, 100, 64, 290],
  ['MED-004', 'Flagyl 400mg', 'Metronidazole', 'Antibiotic', 'Tablet', 3, 6, 1, 120, 340, 520],
  ['MED-005', 'Risek 20mg', 'Omeprazole', 'Gastrointestinal', 'Capsule', 12, 18, 2, 100, 410, 450],
  ['MED-006', 'Gravinate Injection', 'Dimenhydrinate 50mg', 'Gastrointestinal', 'Ampoule', 28, 45, 2, 40, 118, 240],
  ['MED-007', 'Toradol Injection 30mg', 'Ketorolac', 'NSAID', 'Ampoule', 70, 110, 0, 40, 26, 210],
  ['MED-008', 'Dexamethasone Inj 4mg', 'Dexamethasone', 'Steroid', 'Ampoule', 18, 30, 3, 50, 165, 330],
  ['MED-009', 'Ceftriaxone 1g Injection', 'Ceftriaxone', 'Antibiotic', 'Vial', 140, 210, 1, 30, 72, 270],
  ['MED-010', 'Normal Saline 0.9% 500ml', 'Sodium Chloride', 'IV Fluids', 'IV Bag', 95, 150, 3, 40, 96, 600],
  ['MED-011', 'Dextrose 5% 500ml', 'Dextrose', 'IV Fluids', 'IV Bag', 98, 155, 3, 30, 42, -12],
  ['MED-012', 'Ringer Lactate 500ml', 'Compound Sodium Lactate', 'IV Fluids', 'IV Bag', 110, 170, 3, 30, 18, 400],
  ['MED-013', 'Ventolin Nebules 2.5mg', 'Salbutamol', 'Respiratory', 'Ampoule', 22, 38, 2, 60, 210, 22],
  ['MED-014', 'Hydryllin Syrup 120ml', 'Diphenhydramine + Aminophylline', 'Cough & Cold', 'Bottle', 85, 125, 0, 25, 64, 360],
  ['MED-015', 'ORS Sachet', 'Oral Rehydration Salts', 'Rehydration', 'Sachet', 18, 30, 2, 80, 290, 540],
  ['MED-016', 'Avil Injection', 'Pheniramine', 'Antiallergic', 'Ampoule', 15, 28, 1, 40, 12, 180],
  ['MED-017', 'Neurobion Injection', 'Vitamin B1/B6/B12', 'Vitamins', 'Ampoule', 45, 70, 0, 30, 88, 300],
  ['MED-018', 'Voren 75mg Injection', 'Diclofenac Sodium', 'NSAID', 'Ampoule', 20, 35, 3, 40, 134, 25],
  ['MED-019', 'Polyfax Ointment', 'Polymyxin B + Bacitracin', 'Topical', 'Tube', 160, 220, 1, 15, 38, 420],
  ['MED-020', 'Pyodine Solution 60ml', 'Povidone-Iodine', 'Topical', 'Bottle', 120, 170, 2, 10, 24, -40],
  ['MED-021', 'Softin 10mg', 'Loratadine', 'Antiallergic', 'Tablet', 9, 14, 0, 100, 310, 470],
  ['MED-022', 'Glucophage 500mg', 'Metformin', 'Antidiabetic', 'Tablet', 5, 9, 1, 100, 85, 500],
  ['MED-023', 'Norvasc 5mg', 'Amlodipine', 'Cardiovascular', 'Tablet', 16, 24, 1, 80, 240, 460],
  ['MED-024', 'Syringe 5ml', 'Disposable syringe', 'Consumables', 'Piece', 9, 15, 3, 150, 640, 900],
  ['MED-025', 'IV Cannula 22G', 'IV cannula', 'Consumables', 'Piece', 45, 70, 3, 50, 134, 800],
  ['MED-026', 'Surbex-Z', 'Multivitamin + Zinc', 'Vitamins', 'Tablet', 14, 22, 2, 60, 180, 15],
];

/** Medicines commonly bought from an outside medical store (not stocked by the clinic). */
export const STORE_ONLY_MEDICINES = [
  'Calpol Syrup 120mg/5ml',
  'Arinac Forte',
  'Rigix 10mg',
  'Motilium 10mg',
  'Ciproxin 500mg',
  'Amoxil 500mg',
  'Zyrtec Syrup',
  'Nexum 40mg',
  'Lipiget 20mg',
  'Inderal 10mg',
  'Montiget 10mg',
  'Entamizole DS',
  'Ponstan Forte',
  'Myteka 10mg',
  'Getryl 2mg',
];

/**
 * Clinical scenarios used to build realistic visits.
 * clinic: medicines administered/given at the clinic (inventory-tracked)
 * store:  medicines to purchase from a medical store
 */
export const SCENARIOS = [
  {
    complaint: 'High-grade fever with body aches for 2 days',
    diagnosis: 'Acute viral fever',
    clinic: [
      ['MED-007', '30mg IM — stat', 1, 'Single dose at clinic'],
      ['MED-024', '—', 1, 'For injection'],
    ],
    store: [
      ['Panadol 500mg', '2 tab — 3 times a day', 18, 'After meals, for 3 days'],
      ['Arinac Forte', '1 tab — twice a day', 10, 'After meals, for 5 days'],
    ],
  },
  {
    complaint: 'Loose motions and vomiting since last night',
    diagnosis: 'Acute gastroenteritis with mild dehydration',
    clinic: [
      ['MED-010', '500ml IV — over 2 hrs', 1, 'Slow IV infusion'],
      ['MED-006', '50mg IV — stat', 1, 'Add to drip'],
      ['MED-025', '—', 1, 'IV access'],
      ['MED-015', '1 sachet in 1L water', 2, 'Sip frequently'],
    ],
    store: [
      ['Flagyl 400mg', '1 tab — 3 times a day', 15, 'After meals, for 5 days'],
      ['Risek 20mg', '1 cap — once daily', 7, 'Before breakfast'],
    ],
  },
  {
    complaint: 'Wheezing and shortness of breath',
    diagnosis: 'Acute exacerbation of asthma',
    clinic: [
      ['MED-013', '2.5mg nebulization', 2, 'Two nebulizations 20 min apart'],
      ['MED-008', '4mg IV — stat', 1, 'Single dose'],
      ['MED-024', '—', 1, 'For injection'],
    ],
    store: [
      ['Montiget 10mg', '1 tab — at night', 14, 'At bedtime, for 2 weeks'],
      ['Ventolin Inhaler', '2 puffs — when needed', 1, 'Max 8 puffs a day'],
    ],
  },
  {
    complaint: 'Sore throat, cough and runny nose',
    diagnosis: 'Upper respiratory tract infection',
    clinic: [],
    store: [
      ['Augmentin 625mg', '1 tab — twice a day', 10, 'After meals, for 5 days'],
      ['Hydryllin Syrup', '2 tsp — 3 times a day', 1, 'After meals'],
      ['Rigix 10mg', '1 tab — at night', 5, 'At bedtime'],
    ],
  },
  {
    complaint: 'Lower back pain after lifting weight',
    diagnosis: 'Mechanical low back pain',
    clinic: [
      ['MED-018', '75mg IM — stat', 1, 'Deep IM injection'],
      ['MED-024', '—', 1, 'For injection'],
    ],
    store: [
      ['Brufen 400mg', '1 tab — twice a day', 10, 'After meals, for 5 days'],
      ['Myteka 10mg', '1 tab — at night', 5, 'Muscle relaxant'],
    ],
  },
  {
    complaint: 'Routine BP check, occasional headaches',
    diagnosis: 'Essential hypertension — review',
    clinic: [],
    store: [
      ['Norvasc 5mg', '1 tab — once daily', 30, 'Morning, continue'],
      ['Inderal 10mg', '1 tab — twice a day', 30, 'Continue for 1 month'],
    ],
  },
  {
    complaint: 'Follow-up of blood sugar levels',
    diagnosis: 'Type 2 diabetes mellitus — review',
    clinic: [['MED-022', '1 tab — twice a day', 14, 'Starter pack, with meals']],
    store: [
      ['Getryl 2mg', '1 tab — before breakfast', 30, 'Before breakfast'],
      ['Lipiget 20mg', '1 tab — at night', 30, 'At bedtime'],
    ],
  },
  {
    complaint: 'Itchy rash and sneezing',
    diagnosis: 'Allergic reaction / urticaria',
    clinic: [
      ['MED-016', '1 amp IM — stat', 1, 'Single dose'],
      ['MED-008', '4mg IM — stat', 1, 'Single dose'],
      ['MED-024', '—', 2, 'For injections'],
    ],
    store: [
      ['Softin 10mg', '1 tab — once daily', 7, 'For 7 days'],
      ['Zyrtec Syrup', '1 tsp — at night', 1, 'If itching persists'],
    ],
  },
  {
    complaint: 'Burning micturition and lower abdominal pain',
    diagnosis: 'Urinary tract infection',
    clinic: [['MED-009', '1g IV — stat', 1, 'First dose at clinic']],
    store: [
      ['Ciproxin 500mg', '1 tab — twice a day', 10, 'For 5 days'],
      ['Ponstan Forte', '1 tab — when needed', 6, 'For pain'],
    ],
  },
  {
    complaint: 'Weakness, tingling in hands and feet',
    diagnosis: 'Vitamin B12 deficiency (suspected)',
    clinic: [
      ['MED-017', '1 amp IM — stat', 1, 'Weekly dose'],
      ['MED-024', '—', 1, 'For injection'],
    ],
    store: [['Surbex-Z', '1 tab — once daily', 30, 'After breakfast']],
  },
  {
    complaint: 'Small cut on forearm, needs dressing',
    diagnosis: 'Superficial laceration — dressing',
    clinic: [
      ['MED-020', 'Topical — clean wound', 1, 'Wound cleaning'],
      ['MED-019', 'Topical — apply', 1, 'Apply twice daily'],
    ],
    store: [['Amoxil 500mg', '1 cap — 3 times a day', 15, 'For 5 days']],
  },
  {
    complaint: 'Acidity and upper abdominal burning',
    diagnosis: 'Gastritis / dyspepsia',
    clinic: [['MED-005', '1 cap — before breakfast', 7, 'One week course']],
    store: [
      ['Motilium 10mg', '1 tab — 3 times a day', 15, 'Before meals'],
      ['Nexum 40mg', '1 tab — once daily', 14, 'If symptoms persist'],
    ],
  },
  {
    complaint: 'Child with fever and poor feeding',
    diagnosis: 'Viral illness (paediatric)',
    clinic: [['MED-015', '1 sachet in 1L water', 3, 'Small frequent sips']],
    store: [
      ['Calpol Syrup 120mg/5ml', '5ml — 3 times a day', 1, 'For fever'],
      ['Entamizole DS', '5ml — twice a day', 1, 'For 5 days'],
    ],
  },
  {
    complaint: 'Severe dehydration, dizziness',
    diagnosis: 'Heat exhaustion with dehydration',
    clinic: [
      ['MED-012', '500ml IV — over 1 hr', 1, 'IV infusion'],
      ['MED-010', '500ml IV — over 2 hrs', 1, 'Second bag'],
      ['MED-025', '—', 1, 'IV access'],
    ],
    store: [['ORS Sachet', '1 sachet in 1L water', 6, 'Drink throughout the day']],
  },
];

export const FIRST_NAMES_M = [
  'Ahmed', 'Ali', 'Hamza', 'Usman', 'Bilal', 'Imran', 'Faisal', 'Kashif', 'Tariq', 'Zubair',
  'Saad', 'Arslan', 'Waqas', 'Adeel', 'Shahid', 'Junaid', 'Asad', 'Haris', 'Danish', 'Nadeem',
  'Rizwan', 'Owais', 'Talha', 'Yasir', 'Kamran', 'Fahad', 'Salman', 'Ammar', 'Irfan', 'Moiz',
];

export const FIRST_NAMES_F = [
  'Ayesha', 'Fatima', 'Sana', 'Hira', 'Maryam', 'Zainab', 'Amna', 'Rabia', 'Saima', 'Nida',
  'Mehwish', 'Kiran', 'Iqra', 'Sadia', 'Anum', 'Bushra', 'Farah', 'Uzma', 'Sobia', 'Hafsa',
  'Mahnoor', 'Areeba', 'Laiba', 'Noor', 'Rubina', 'Shazia', 'Asma', 'Javeria', 'Komal', 'Tehmina',
];

export const LAST_NAMES = [
  'Khan', 'Ahmed', 'Malik', 'Hussain', 'Butt', 'Qureshi', 'Siddiqui', 'Sheikh', 'Chaudhry', 'Raza',
  'Iqbal', 'Javed', 'Mirza', 'Abbasi', 'Rana', 'Shah', 'Akhtar', 'Aslam', 'Bhatti', 'Farooq',
  'Nawaz', 'Anwar', 'Yousaf', 'Rehman', 'Gill', 'Saleem', 'Hashmi', 'Zafar',
];

export const AREAS = [
  'Gulberg III', 'Model Town', 'Johar Town', 'DHA Phase 5', 'Faisal Town', 'Garden Town',
  'Iqbal Town', 'Township', 'Wapda Town', 'Samanabad', 'Cantt', 'Shadman', 'Bahria Town',
  'Allama Iqbal Town', 'Valencia Town',
];
