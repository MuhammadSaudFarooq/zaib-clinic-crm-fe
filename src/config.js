/**
 * Runtime configuration from Vite environment variables (.env).
 * Only variables prefixed with VITE_ reach the browser — never put secrets here.
 * Every value has a safe default, so the app also runs without a .env file.
 */

const env = import.meta.env || {};

const bool = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  return ['true', '1', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

const int = (value, fallback, min, max) => {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

const config = {
  /** Browser tab title */
  appTitle: env.VITE_APP_TITLE || 'Zaib Clinic — Clinic Management',

  /** Base URL of a future backend API (unused in this frontend-only build) */
  apiBaseUrl: env.VITE_API_BASE_URL || '',

  /** Prefix for localStorage / sessionStorage keys */
  storagePrefix: env.VITE_STORAGE_PREFIX || 'zaib-clinic',

  /** Show the one-click demo account buttons on the login screen */
  showDemoAccounts: bool(env.VITE_SHOW_DEMO_ACCOUNTS, true),

  /** Regenerate mock data on each new calendar day so "today" always looks live */
  demoAutoResetDaily: bool(env.VITE_DEMO_AUTO_RESET_DAILY, true),

  /** Days of mock history to generate (14–90). More days = more localStorage used. */
  demoHistoryDays: int(env.VITE_DEMO_HISTORY_DAYS, 60, 14, 90),

  /** Simulated login latency in milliseconds (0–5000) */
  loginDelayMs: int(env.VITE_LOGIN_DELAY_MS, 650, 0, 5000),
};

export default config;
