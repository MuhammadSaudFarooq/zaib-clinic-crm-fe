import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Maximize2, Volume2 } from 'lucide-react';
import Logo from '@/components/brand/Logo';
import { useData } from '@/context/DataContext';
import { formatDate, formatTime, padToken } from '@/utils/format';

/** Waiting-room "Now Serving" board. Updates live across browser tabs. */
export default function TokenDisplay() {
  const { todayVisits, doctors, lookup, state } = useData();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const waiting = todayVisits.filter((v) => v.status === 'waiting');
  const firstName = (id) => {
    const n = lookup.patient[id]?.name || '';
    const [f, l] = n.split(' ');
    return `${f} ${l ? `${l[0]}.` : ''}`;
  };

  return (
    <div className="display">
      <header className="display__head">
        <Logo tone="light" size={52} />
        <div className="display__clock">
          <strong>{formatTime(now)}</strong>
          <span>{formatDate(now, { withDay: true })}</span>
        </div>
      </header>

      <main className="display__main">
        <section className="display__serving">
          <h2>
            <Volume2 size={26} /> Now Serving
          </h2>
          <div className="display__rooms">
            {doctors.map((d) => {
              const current = todayVisits.find((v) => v.status === 'in_consultation' && v.doctorId === d.id);
              return (
                <div key={d.id} className="display__room">
                  <div className="display__room-name">{d.room || 'Consultation'}</div>
                  <div className="display__token" key={current?.id || 'none'}>
                    {current ? padToken(current.tokenNo) : '—'}
                  </div>
                  <div className="display__patient">{current ? firstName(current.patientId) : 'Please wait'}</div>
                  <div className="display__doctor">{d.name}</div>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="display__next">
          <h2>Next in line</h2>
          <ol>
            {waiting.slice(0, 8).map((v) => (
              <li key={v.id}>
                <span className="display__next-token">{padToken(v.tokenNo)}</span>
                <span className="display__next-name">{firstName(v.patientId)}</span>
                <span className="display__next-room">{lookup.staff[v.doctorId]?.room || ''}</span>
              </li>
            ))}
            {waiting.length === 0 && <li className="display__empty">No patients waiting</li>}
          </ol>
          <div className="display__waiting-count">
            <strong>{waiting.length}</strong> patient{waiting.length === 1 ? '' : 's'} waiting
          </div>
        </aside>
      </main>

      <footer className="display__foot">
        <div className="display__ticker">
          <span>
            Welcome to {state.settings.clinic.name} · Please keep your token slip with you · Billing is completed after your consultation · Timings:{' '}
            {state.settings.clinic.timings} · For emergencies call {state.settings.clinic.mobile}
          </span>
        </div>
        <div className="display__controls">
          <Link to="/queue" className="display__btn">
            <ArrowLeft size={16} /> Back
          </Link>
          <button type="button" className="display__btn" onClick={() => document.documentElement.requestFullscreen?.()}>
            <Maximize2 size={16} /> Fullscreen
          </button>
        </div>
      </footer>
    </div>
  );
}
