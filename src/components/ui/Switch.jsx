export default function Switch({ checked, onChange, label, disabled, name }) {
  return (
    <label className="switch" style={disabled ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}>
      <input
        type="checkbox"
        name={name}
        checked={!!checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span className="switch__track" />
      {label && <span className="switch__label">{label}</span>}
    </label>
  );
}
