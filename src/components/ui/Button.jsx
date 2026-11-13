import { Link } from 'react-router-dom';
import { cx } from '@/utils/format';

export default function Button({
  variant = 'primary',
  size,
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  block = false,
  iconOnly = false,
  to,
  className,
  children,
  type = 'button',
  disabled,
  ...rest
}) {
  const classes = cx(
    'btn',
    `btn--${variant}`,
    size && `btn--${size}`,
    block && 'btn--block',
    iconOnly && 'btn--icon',
    className,
  );
  const iconSize = size === 'sm' ? 15 : size === 'lg' ? 19 : 17;
  const content = (
    <>
      {loading ? <span className="spinner" aria-hidden /> : Icon ? <Icon size={iconSize} aria-hidden /> : null}
      {children}
      {IconRight && !loading ? <IconRight size={iconSize} aria-hidden /> : null}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} disabled={disabled || loading} {...rest}>
      {content}
    </button>
  );
}
