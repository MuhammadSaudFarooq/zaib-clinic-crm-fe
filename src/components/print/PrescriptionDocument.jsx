import { LogoMark } from '@/components/brand/Logo';
import { CATEGORIES } from '@/data/constants';
import { formatDate, formatDateTime, formatTime, padToken } from '@/utils/format';

/**
 * A4 prescription document.
 * type = "clinic" → Clinic Prescription (medicines given / administered by the clinic)
 * type = "store"  → Medical Store Prescription (medicines to buy from an outside store)
 */
export default function PrescriptionDocument({ type = 'clinic', visit, patient, doctor, settings }) {
  const isClinic = type === 'clinic';
  const rx = isClinic ? visit.clinicRx : visit.storeRx;
  const items = rx?.items || [];
  const { clinic, prescription: ps } = settings;
  const rxNo = `${isClinic ? 'CRX' : 'MRX'}-${visit.id.replace('VIS-', '')}`;
  const title = isClinic ? ps.clinicTitle : ps.storeTitle;
  const vitals = visit.vitals || {};

  return (
    <article className={`rx-doc rx-doc--${type}`}>
      <header className="rx-doc__head">
        <div className="rx-doc__brand">
          {ps.showLogo &&
            (settings.logo ? (
              <img src={settings.logo} alt="" className="rx-doc__logo-img" />
            ) : (
              <LogoMark size={58} />
            ))}
          <div>
            <div className="rx-doc__clinic">{clinic.name}</div>
            <div className="rx-doc__tagline">{clinic.tagline}</div>
            <div className="rx-doc__doctor-line">
              {doctor?.name || 'Consultant Physician'}
              {doctor?.designation ? ` · ${doctor.designation}` : ''}
            </div>
          </div>
        </div>
        <div className="rx-doc__contact">
          <div>{clinic.address}</div>
          <div>{clinic.city}</div>
          <div>
            {clinic.phone} · {clinic.mobile}
          </div>
          <div>
            {clinic.email} · {clinic.website}
          </div>
          <div>Reg. No: {clinic.registrationNo}</div>
        </div>
      </header>

      <div className="rx-doc__band">
        <div>
          <div className="rx-doc__title">{title}</div>
          <div className="rx-doc__title-sub">
            {isClinic
              ? 'Medicines administered / provided directly by the clinic'
              : 'Medicines to be purchased from a medical store outside the clinic'}
          </div>
        </div>
        <div className="rx-doc__no">
          <span>Rx No.</span>
          <strong>{rxNo}</strong>
        </div>
      </div>

      <section className="rx-doc__patient">
        <div>
          <span>Patient Name</span>
          <strong>{patient.name}</strong>
        </div>
        <div>
          <span>Patient ID</span>
          <strong>{patient.id}</strong>
        </div>
        <div>
          <span>Age / Gender</span>
          <strong>
            {patient.age} yrs / {patient.gender}
          </strong>
        </div>
        <div>
          <span>Phone</span>
          <strong>{patient.phone}</strong>
        </div>
        <div>
          <span>Visit Date</span>
          <strong>
            {formatDate(visit.date)} · {formatTime(visit.registeredAt)}
          </strong>
        </div>
        <div>
          <span>Token No.</span>
          <strong>#{padToken(visit.tokenNo)}</strong>
        </div>
        <div>
          <span>Doctor</span>
          <strong>{doctor?.name || '—'}</strong>
        </div>
        <div>
          <span>Category</span>
          <strong>{CATEGORIES[visit.category]?.label || 'Regular Patient'}</strong>
        </div>
      </section>

      {ps.showVitals && (vitals.bp || vitals.pulse || vitals.temp) && (
        <section className="rx-doc__vitals">
          {vitals.bp && (
            <span>
              BP <strong>{vitals.bp}</strong> mmHg
            </span>
          )}
          {vitals.pulse && (
            <span>
              Pulse <strong>{vitals.pulse}</strong> /min
            </span>
          )}
          {vitals.temp && (
            <span>
              Temp <strong>{vitals.temp}</strong> °F
            </span>
          )}
          {vitals.weight && (
            <span>
              Weight <strong>{vitals.weight}</strong> kg
            </span>
          )}
          {vitals.spo2 && (
            <span>
              SpO₂ <strong>{vitals.spo2}</strong>%
            </span>
          )}
        </section>
      )}

      <section className="rx-doc__clinical">
        <div>
          <span className="rx-doc__label">Presenting complaint</span>
          <p>{visit.complaint || '—'}</p>
        </div>
        <div>
          <span className="rx-doc__label">Diagnosis</span>
          <p>{visit.consultation?.diagnosis || '—'}</p>
        </div>
      </section>

      <section className="rx-doc__meds">
        <div className="rx-doc__rx-symbol" aria-hidden>
          ℞
        </div>
        <table>
          <thead>
            <tr>
              <th style={{ width: 34 }}>#</th>
              <th>Medicine</th>
              <th>Dosage</th>
              <th style={{ width: 60, textAlign: 'center' }}>Qty</th>
              <th>Instructions</th>
              {isClinic && <th style={{ width: 92 }}>Status</th>}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={isClinic ? 6 : 5} style={{ textAlign: 'center', color: '#667' }}>
                  No medicines prescribed on this prescription.
                </td>
              </tr>
            )}
            {items.map((item, i) => (
              <tr key={item.id || i}>
                <td>{i + 1}</td>
                <td>
                  <strong>{item.name}</strong>
                </td>
                <td>{item.dosage}</td>
                <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                <td>{item.instructions}</td>
                {isClinic && (
                  <td>{item.dispensed ? `Given (${item.dispensedQty})` : item.declined ? 'Not given' : 'To dispense'}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {(rx?.notes || visit.consultation?.notes) && (
        <section className="rx-doc__notes">
          <span className="rx-doc__label">Notes</span>
          {rx?.notes && <p>{rx.notes}</p>}
          {isClinic && visit.consultation?.notes && <p>{visit.consultation.notes}</p>}
        </section>
      )}

      <section className="rx-doc__bottom">
        <div>
          {visit.consultation?.followUpDate && (
            <div className="rx-doc__followup">
              Follow-up on <strong>{formatDate(visit.consultation.followUpDate, { withDay: true })}</strong>
            </div>
          )}
          <div className="rx-doc__timings">Clinic timings: {clinic.timings}</div>
        </div>
        {ps.showSignature && (
          <div className="rx-doc__sign">
            <div className="rx-doc__sign-line" />
            <strong>{doctor?.name || 'Doctor'}</strong>
            <span>{doctor?.designation || 'Signature & stamp'}</span>
          </div>
        )}
      </section>

      <footer className="rx-doc__foot">
        <span>{ps.footerNote}</span>
        <span>Printed {formatDateTime(new Date())}</span>
      </footer>
    </article>
  );
}
