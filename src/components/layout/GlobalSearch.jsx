import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { VisitStatusBadge } from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { padToken } from '@/utils/format';

export default function GlobalSearch() {
  const { state, todayVisits, lookup } = useData();
  const { can } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, []);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return { patients: [], tokens: [] };
    const patients = can('patients.view')
      ? state.patients
          .filter(
            (p) =>
              p.name.toLowerCase().includes(term) ||
              p.id.toLowerCase().includes(term) ||
              p.phone.replace(/-/g, '').includes(term.replace(/-/g, '')),
          )
          .slice(0, 6)
      : [];
    const tokenNum = Number(term.replace(/^#/, ''));
    const tokens = can('queue.view')
      ? todayVisits
          .filter((v) => (tokenNum && v.tokenNo === tokenNum) || lookup.patient[v.patientId]?.name.toLowerCase().includes(term))
          .slice(0, 5)
      : [];
    return { patients, tokens };
  }, [q, state.patients, todayVisits, lookup, can]);

  const go = (path) => {
    setOpen(false);
    setQ('');
    navigate(path);
  };

  const hasResults = results.patients.length || results.tokens.length;

  return (
    <div className="topbar__search" ref={ref}>
      <Search size={17} />
      <input
        ref={inputRef}
        type="search"
        placeholder="Search patients, ID, phone or token #…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        aria-label="Global search"
      />
      {!q && <kbd>Ctrl K</kbd>}
      {open && q.trim().length >= 2 && (
        <div className="search-results">
          {!hasResults && <div className="empty__text" style={{ padding: 14 }}>No matches for “{q}”.</div>}
          {results.tokens.length > 0 && <div className="search-results__group">Today’s tokens</div>}
          {results.tokens.map((v) => (
            <button key={v.id} type="button" className="search-result" onClick={() => go(`/visits/${v.id}`)}>
              <span className="token-chip token-chip--sm">{padToken(v.tokenNo)}</span>
              <span className="grow truncate fw-600">{lookup.patient[v.patientId]?.name}</span>
              <VisitStatusBadge status={v.status} />
            </button>
          ))}
          {results.patients.length > 0 && <div className="search-results__group">Patients</div>}
          {results.patients.map((p) => (
            <button key={p.id} type="button" className="search-result" onClick={() => go(`/patients/${p.id}`)}>
              <Avatar name={p.name} size="sm" />
              <span className="grow" style={{ minWidth: 0 }}>
                <span className="fw-600 truncate" style={{ display: 'block' }}>
                  {p.name}
                </span>
                <span className="text-xs muted">
                  {p.id} · {p.phone}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
