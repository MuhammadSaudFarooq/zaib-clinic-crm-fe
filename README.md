<p align="center">
  <img src="public/logo.svg" alt="Zaib Clinic" width="300" />
</p>

# Zaib Clinic — Clinic Management System (Frontend)

A modern, frontend-only clinic management system for **Zaib Clinic**: patient registration, tokens and queue, doctor consultations with **two separate prescriptions**, medicine dispensing, end-of-visit billing with **80mm thermal receipts**, inventory, staff and roles, reports and settings.

> **Frontend only.** There is no backend, database or API. All data is realistic mock data generated in the browser and saved to `localStorage`, so every workflow can be explored end to end.

---

## Tech stack

| Purpose | Library |
| --- | --- |
| UI | React 18 |
| Build tool / dev server | Vite 5 |
| Routing | React Router v6 |
| Forms | Formik |
| Validation | Yup |
| Charts | Recharts |
| Icons | lucide-react |
| Font | Plus Jakarta Sans (bundled via `@fontsource`, works offline) |

Styling is a hand-written design system in plain CSS (`src/styles`). No UI framework is required.

---

## Getting started

**Prerequisites:** Node.js 18+ (20 LTS recommended) and npm.

```bash
npm install
cp .env.example .env   # optional — Windows: copy .env.example .env
npm run dev            # starts Vite on http://localhost:5173
```

Other scripts:

```bash
npm run build      # production build into dist/
npm run preview    # serve the production build locally
```

> **Note on `NODE_ENV=production`.** If your machine sets `NODE_ENV=production` globally, npm normally skips `devDependencies` (Vite). The project's `.npmrc` (`include=dev`) makes sure they are still installed, and `vite.config.js` forces development mode for `npm run dev`, so the dev server works either way.

---

## Environment variables

The app is configured through a `.env` file in the project root. `.env.example` documents every variable. Copy it to `.env` and adjust the values. `.env` is git-ignored. Every variable is optional: without a `.env` file the defaults below apply.

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_APP_TITLE` | `Zaib Clinic — Clinic Management` | Browser tab title |
| `VITE_API_BASE_URL` | *(empty)* | Base URL of a future backend API. Unused in this frontend-only build. |
| `VITE_STORAGE_PREFIX` | `zaib-clinic` | Prefix for `localStorage` / `sessionStorage` keys. Change it to start fresh. |
| `VITE_SHOW_DEMO_ACCOUNTS` | `true` | Show the one-click demo account buttons on the login screen |
| `VITE_DEMO_AUTO_RESET_DAILY` | `true` | Regenerate mock data each new day. Set to `false` to keep your changes across days. |
| `VITE_DEMO_HISTORY_DAYS` | `60` | Days of mock history (14–90). More days use more `localStorage` (~30 KB per day). |
| `VITE_LOGIN_DELAY_MS` | `650` | Simulated login latency (0–5000 ms) |
| `DEV_SERVER_PORT` | `5173` | Port for `npm run dev` / `npm run preview` (read by `vite.config.js` only) |
| `DEV_SERVER_OPEN` | `true` | Open the browser automatically when the dev server starts |

Variables are read in `src/config.js`, and the dev-server options in `vite.config.js`. Restart `npm run dev` after editing `.env`.

> **Security:** anything prefixed with `VITE_` is embedded in the JavaScript bundle and visible to every user. Never put secrets, passwords or private API keys in `.env`. Do not set `NODE_ENV` there either, because Vite manages it.

---

## Demo accounts

The login screen has one-click buttons that fill in these accounts.

| Role | Email | Password |
| --- | --- | --- |
| **Administrator** | `admin@zaibclinic.com` | `Admin@1234` |
| Doctor | `doctor@zaibclinic.com` | `Doctor@1234` |
| Doctor (2nd) | `sana@zaibclinic.com` | `Doctor@1234` |
| Receptionist | `reception@zaibclinic.com` | `Staff@1234` |
| Pharmacist / Nurse | `pharmacy@zaibclinic.com` | `Staff@1234` |
| Cashier / Accounts | `billing@zaibclinic.com` | `Staff@1234` |

`farah@zaibclinic.com` is an **inactive** account, so you can see what happens when a deactivated user tries to log in.

**Remember me** keeps you signed in across browser restarts (`localStorage`). Without it, the session ends when the tab closes (`sessionStorage`).

---

## The patient journey

```
Registration → Token → Waiting queue → Consultation → Clinic Rx + Medical Store Rx
            → Dispensing (if any clinic medicines) → Billing → Thermal receipt
```

The workflow follows these rules:

- **Billing happens at the end** of the visit, never at registration.
- The doctor writes **two separate prescriptions**, each with its own print button:
  - **Clinic Prescription**: medicines given or administered by the clinic, picked from clinic inventory.
  - **Medical Store Prescription**: medicines the patient buys from an outside store, typed freely.
- **Stock is deducted only when clinic medicines are dispensed or administered**, never when they are prescribed.
- **Free and follow-up patients** have colour-coded tags (each with an icon) on patient records, the queue, consultation and billing screens.
- **Every visit** has its own date, token, prescriptions and billing record.

### Try it in 2 minutes

1. Sign in as **Admin** (or **Reception**).
2. Click **New Token** in the top bar. Search for a patient or **Register new**. The category is suggested automatically: a patient who already visited today gets *Same-Day Follow-up*, one who visited yesterday gets *Next-Day Follow-up*, and so on. Pick a doctor and click **Issue token**. You can print a token slip.
3. Go to **Tokens & Queue** and click **Call next** on a doctor card, or **Call in** on a row.
4. Go to **Consultations** and open the patient. Enter a diagnosis, add **clinic medicines** (from inventory) and **store medicines**, preview or print each prescription, then click **Complete consultation**.
5. Go to **Dispensing**. Tick what was actually given and click **Dispense & send to billing**. Inventory goes down only now.
6. Go to **Billing** and click **Checkout**. The fee is set by the patient category. Add any extra charges or a discount, choose **Cash / Card / Other**, then **Complete billing**. Use the receipt preview and **Print Receipt** (80mm).
7. Open **Visit Records** to see the whole journey: a timeline, both prescriptions and the bill.

Open **Token Display Board** from the sidebar in a second tab for a waiting-room "Now Serving" screen. It updates live as patients are called.

---

## Modules

| Module | Highlights |
| --- | --- |
| **Dashboard** | 10 KPI cards (total, today, waiting, completed, free, follow-up, revenue, pending bills, low stock, inventory), live patient-flow bar, charts for daily visits, revenue, patient categories and medicine consumption, recent patients and an activity feed. Finance and inventory cards are hidden from roles without access. |
| **Patients** | Registration with Formik + Yup, an auto-generated unique ID (`ZC-#####`), search by name / ID / phone, filters, CSV export. The patient profile shows visit history, previous prescriptions (preview / print) and previous bills (receipt preview / print). |
| **Tokens & Queue** | Daily tokens with registration time, visit date, wait time, doctor assignment (reassign inline) and status. Includes a "Now serving" card per doctor, list and board views, status tabs, cancel token, and a past-date viewer. |
| **Consultations** | Doctor's waiting list, call-in, clinical assessment (vitals, complaint, diagnosis, notes, follow-up date), category change, both prescription editors with multiple medicines, a stock warning, **repeat a previous prescription**, save draft, and A4 preview / print. |
| **Dispensing** | Pending clinic prescriptions. Tick and set quantities per item with live stock checks. Every dispense creates a stock-out record. "None given" skips straight to billing. |
| **Billing** | Ready-for-billing queue and a checkout that applies category-based fees. Supports full waiver, additional charges, amount or percent discount (permission-controlled), cash / card / other, partial payments, change calculation and collecting pending balances later. Includes the bills list with filters and CSV export, plus the thermal receipt preview and print. |
| **Visit Records** | Every visit across dates with filters. The detail page shows the journey stepper, timeline, consultation, both prescriptions and the bill. |
| **Inventory** | Medicines with category, unit, batch, expiry, purchase / selling price, supplier and entry date. Tracks received, consumed, adjusted and available stock, low-stock and expired / expiring tabs, and a stock in / out ledger. Includes add medicine, stock in (purchase), stock adjustment (expired / damaged / returned / correction), and a per-medicine usage chart and history. |
| **Staff & Roles** | Add or edit staff, assign roles, activate or deactivate accounts (with safeguards for your own account and the last admin), plus a role × permission matrix. |
| **Reports** | Date presets and a custom range. Daily and monthly patient reports, revenue, free patients, follow-ups, medicine consumption, inventory and payment methods. Every report has charts and CSV export. |
| **Settings** | Clinic info, logo upload, contact details, consultation fee, follow-up and category fee rules (with resulting fees), receipt and prescription settings with **live previews**, roles and permissions, and a demo-data reset. |

---

## Patient categories & default charges

The standard consultation fee is **Rs. 1,500**. You can edit every rule in **Settings → Follow-up & category charges**.

| Tag | Default rule | Consultation charged |
| --- | --- | --- |
| Regular Patient | Full fee | Rs. 1,500 |
| Follow-up | Fixed reduced fee | Rs. 700 |
| Next-Day Follow-up | Fixed reduced fee | Rs. 500 |
| Same-Day Follow-up | Waived | Rs. 0 |
| Discounted Patient | 30% off | Rs. 1,050 |
| Free Patient | Waived | Rs. 0 |
| No-Charge Visit | Waived | Rs. 0 |
| Morning Visit / Evening Visit | Session tags (no fee effect) | — |

Clinic medicines are added to the bill only if they were actually dispensed. Manual discounts need the *Apply manual discounts* permission and are capped by **Maximum manual discount (%)**.

---

## Roles & permissions (defaults)

| Role | Access |
| --- | --- |
| Administrator | Everything (cannot be restricted) |
| Doctor | Dashboard, patients (view), queue (view), consultations & prescriptions, inventory (view), reports |
| Receptionist | Dashboard, patients (register/edit), tokens & queue, billing (create) |
| Pharmacist / Nurse | Dashboard, patients (view), queue (view), dispensing, inventory (manage) |
| Cashier / Accounts | Dashboard, patients (view), queue (view), billing incl. discounts, reports |

Admins can change any non-admin role in **Staff & Roles → Roles & permissions** (or **Settings → User roles & permissions**). The sidebar, routes and action buttons update immediately. Each user can see their own access under **My profile & access**.

---

## Printing

Printing uses the browser's print dialog. Only the document is printed, with no app UI.

| Document | Paper | Where |
| --- | --- | --- |
| Clinic Prescription | A4 | Consultation, Visit Records, Patient → Prescriptions |
| Medical Store Prescription | A4 | Same places, with its own print button |
| Payment receipt | 80mm thermal roll | Checkout, Billing list, Visit Records, Patient → Bills |
| Token slip | 80mm thermal roll | After issuing a token |

Tips for thermal printers:

- Select the thermal printer and set **Margins: None**, **Scale: 100%**, and turn off **Headers and footers**.
- The page size is set automatically (`@page { size: 80mm auto }`). Receipts are pure black-on-white with a mono version of the logo.

---

## Mock data & persistence

- About 60 days of history are generated **relative to today**: about 240 patients, 750 visits, 730 bills, 26 medicines and 1,400 stock movements. "Today" always has a live queue with patients waiting, in consultation, at dispensing, at billing and completed, plus some low-stock and expired medicines and pending bills.
- Changes are saved to `localStorage` under the key `zaib-clinic:data`, so they survive a page refresh. Open tabs stay in sync, which is how the display board updates.
- **The mock data is regenerated automatically on a new calendar day** so the "today" views always look realistic. To keep your changes across days, set `VITE_DEMO_AUTO_RESET_DAILY=false` in `.env`. To reset manually, use **Settings → Demo data → Reset demo data**.

---

## Project structure

```
src/
├── App.jsx                  # Routes (lazy-loaded pages, permission guards)
├── config.js                # Reads VITE_* environment variables with safe defaults
├── main.jsx                 # Providers: Data → Auth → Toast → Print
├── components/
│   ├── brand/Logo.jsx       # Zaib Clinic logo (dark / light / mono variants)
│   ├── charts/ChartKit.jsx  # Recharts theme, tooltip, legend, colour-blind-safe palette
│   ├── form/Fields.jsx      # Formik-aware inputs (text, select, textarea, switch, table cells)
│   ├── layout/              # App shell, sidebar, top bar, global search, route guards
│   ├── print/               # A4 prescription, 80mm thermal receipt, preview modals
│   └── ui/                  # Button, Card, Modal, Tabs, Badge, CategoryTag, StatCard, …
├── context/
│   ├── DataContext.jsx      # Mock data store + all actions (localStorage persistence)
│   ├── AuthContext.jsx      # Frontend-only login, roles & permissions
│   ├── PrintContext.jsx     # Print engine (A4 / 80mm page sizes)
│   └── ToastContext.jsx
├── data/
│   ├── constants.js         # Categories/tags, statuses, roles, permissions, units…
│   ├── catalog.js           # Medicines, clinical scenarios, names
│   └── seed.js              # Deterministic mock-data generator
├── pages/                   # auth, dashboard, patients, queue, consultation, pharmacy,
│                            # billing, inventory, staff, reports, settings, misc
├── styles/                  # base, layout, components, pages, print
└── utils/                   # billing maths, analytics, formatting, validation
```

The `@` import alias points to `src/` (see `vite.config.js`).

---

## Connecting a real backend later

All reads and writes go through `src/context/DataContext.jsx` (`api.addPatient`, `api.issueToken`, `api.saveConsultation`, `api.dispense`, `api.createBill`, `api.stockIn`, …) and `src/context/AuthContext.jsx` (`login` / `logout`). To connect a server, replace those implementations with API calls. Pages and components do not need to change.

---

## License

MIT — see [LICENSE](LICENSE).
