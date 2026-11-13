import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { cx } from '@/utils/format';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div className={cx('app-shell', open && 'sidebar-open')}>
      <Sidebar onNavigate={() => setOpen(false)} />
      <div className="sidebar-backdrop" onClick={() => setOpen(false)} />
      <div className="main">
        <Topbar onMenu={() => setOpen(true)} />
        <main className="page" key={location.pathname}>
          <Suspense
            fallback={
              <div className="loader-screen">
                <span className="spinner-lg" aria-label="Loading" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
