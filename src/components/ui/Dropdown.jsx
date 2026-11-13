import { useEffect, useRef, useState } from 'react';
import { cx } from '@/utils/format';

/**
 * Click-to-open dropdown. `children` may be a function receiving `close`.
 */
export default function Dropdown({ trigger, children, align = 'right', wide = false, className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className={cx('dropdown', className)} ref={ref}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div className={cx('dropdown__menu', align === 'left' && 'dropdown__menu--left', wide && 'dropdown__menu--wide')}>
          {typeof children === 'function' ? children(close) : children}
        </div>
      )}
    </div>
  );
}
