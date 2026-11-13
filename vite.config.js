import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ command, mode }) => {
  // Some machines export NODE_ENV=production globally. That breaks the React dev
  // runtime under `vite` (e.g. "jsxDEV is not a function"), so force a proper
  // development build when running the dev server.
  if (command === 'serve') process.env.NODE_ENV = 'development';

  // Load every variable from .env files (not only VITE_*) for the dev-server options.
  // These non-VITE_ variables are used here only and never reach the browser.
  const env = loadEnv(mode, process.cwd(), '');
  const port = Number.parseInt(env.DEV_SERVER_PORT, 10) || 5173;
  const open = env.DEV_SERVER_OPEN ? env.DEV_SERVER_OPEN.toLowerCase() === 'true' : true;

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port,
      open,
    },
    preview: {
      port,
    },
  };
});
