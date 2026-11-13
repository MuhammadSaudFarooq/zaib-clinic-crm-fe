import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Print engine.
 * Renders the requested document into #print-root (outside the app shell),
 * injects the right @page size (A4 for prescriptions, 80mm for thermal
 * receipts) and opens the browser print dialog. Screen UI is hidden in print
 * via styles/print.css, so only the document is printed.
 */

const PrintContext = createContext(null);
const PAGE_STYLE_ID = 'zc-print-page-style';

const PAGE_PRESETS = {
  a4: { size: 'A4 portrait', margin: '12mm 12mm 14mm', bodyClass: 'print-a4' },
  thermal: { size: '80mm auto', margin: '0', bodyClass: 'print-thermal' },
};

export function PrintProvider({ children }) {
  const [job, setJob] = useState(null);
  const [root, setRoot] = useState(null);

  useEffect(() => {
    let el = document.getElementById('print-root');
    if (!el) {
      el = document.createElement('div');
      el.id = 'print-root';
      document.body.appendChild(el);
    }
    setRoot(el);
  }, []);

  const print = useCallback((node, { format = 'a4', title } = {}) => {
    setJob({ node, format, title, key: Date.now() });
  }, []);

  useEffect(() => {
    if (!job) return undefined;
    const preset = PAGE_PRESETS[job.format] || PAGE_PRESETS.a4;
    let style = document.getElementById(PAGE_STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = PAGE_STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = `@page { size: ${preset.size}; margin: ${preset.margin}; }`;
    document.body.classList.add(preset.bodyClass);
    const prevTitle = document.title;
    if (job.title) document.title = job.title;

    const cleanup = () => {
      document.body.classList.remove(preset.bodyClass);
      document.title = prevTitle;
      setJob(null);
    };

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.removeEventListener('afterprint', finish);
      cleanup();
    };
    window.addEventListener('afterprint', finish);

    // let React paint the portal (and fonts/images settle) before printing
    const t = setTimeout(() => {
      window.print();
      // Some browsers don't fire afterprint reliably — fall back after the dialog closes.
      setTimeout(finish, 800);
    }, 120);

    return () => {
      clearTimeout(t);
      window.removeEventListener('afterprint', finish);
    };
  }, [job]);

  const value = useMemo(() => ({ print }), [print]);

  return (
    <PrintContext.Provider value={value}>
      {children}
      {root && job ? createPortal(<div key={job.key} className={`print-doc print-doc--${job.format}`}>{job.node}</div>, root) : null}
    </PrintContext.Provider>
  );
}

export function usePrint() {
  const ctx = useContext(PrintContext);
  if (!ctx) throw new Error('usePrint must be used inside <PrintProvider>');
  return ctx;
}
