import { cx } from '@/utils/format';

export function Card({ className, pad = false, children, ...rest }) {
  return (
    <div className={cx('card', pad && 'card--pad', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, icon: Icon, actions, plain = false, className }) {
  return (
    <div className={cx('card__header', plain && 'card__header--plain', className)}>
      <div className="card__title">
        {Icon && (
          <span className="card__title-icon">
            <Icon size={17} />
          </span>
        )}
        <div>
          <div>{title}</div>
          {subtitle && <div className="card__subtitle">{subtitle}</div>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-8 wrap">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, children, ...rest }) {
  return (
    <div className={cx('card__body', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children }) {
  return <div className={cx('card__footer', className)}>{children}</div>;
}

export default Card;
