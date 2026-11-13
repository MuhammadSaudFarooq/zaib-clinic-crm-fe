import { Search, X } from 'lucide-react';

export default function SearchInput({ value, onChange, placeholder = 'Search…', autoFocus, className = '' }) {
  return (
    <div className={`search-input ${className}`}>
      <Search size={16} />
      <input
        className="input"
        type="search"
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          type="button"
          className="icon-btn icon-btn--plain"
          style={{ position: 'absolute', right: 2, top: 2, width: 34, height: 34 }}
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
