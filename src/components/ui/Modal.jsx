import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cx } from '@/utils/format';
import Button from './Button';

// Stack of open modals so Escape only closes the top-most one.
const stack = [];

export default function Modal({ open, onClose, title, subtitle, size, footer, footerBetween = false, children, closeOnBackdrop = true }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const id = Symbol('modal');
    stack.push(id);
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape' && stack[stack.length - 1] === id) closeRef.current?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      stack.splice(stack.indexOf(id), 1);
      if (stack.length === 0) document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className={cx('modal', size && `modal--${size}`)} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
        {(title || onClose) && (
          <div className="modal__header">
            <div>
              {title && <div className="modal__title">{title}</div>}
              {subtitle && <div className="modal__subtitle">{subtitle}</div>}
            </div>
            {onClose && (
              <button type="button" className="icon-btn icon-btn--plain" onClick={onClose} aria-label="Close">
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className="modal__body">{children}</div>
        {footer && <div className={cx('modal__footer', footerBetween && 'modal__footer--between')}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', tone = 'primary' }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={tone}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="muted">{message}</p>
    </Modal>
  );
}
