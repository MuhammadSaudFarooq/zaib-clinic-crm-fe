import { LogoMark } from '@/components/brand/Logo';
import { CATEGORIES, PAYMENT_METHODS, PAYMENT_STATUS } from '@/data/constants';
import { formatDate, formatTime, padToken } from '@/utils/format';

const money = (n) => Math.round(Number(n) || 0).toLocaleString('en-US');

function Row({ label, value, strong, big }) {
  return (
    <div className={`tr-row${strong ? ' tr-row--strong' : ''}${big ? ' tr-row--big' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

/**
 * 80mm thermal-printer receipt. Pure black-on-white, monospace figures,
 * ~72mm printable width (fits standard 80mm rolls).
 */
export default function ThermalReceipt({ bill, patient, visit, doctor, cashier, settings }) {
  const { clinic, receipt: rs, fees } = settings;
  const cur = fees.currency;
  const method = PAYMENT_METHODS.find((m) => m.id === bill.paymentMethod)?.label || bill.paymentMethod;
  const manual = bill.discount?.amount || 0;

  return (
    <div className="thermal">
      <div className="thermal__center">
        {rs.showLogo &&
          (settings.logo ? (
            <img src={settings.logo} alt="" className="thermal__logo-img" />
          ) : (
            <div className="thermal__logo">
              <LogoMark size={46} tone="mono" />
            </div>
          ))}
        <div className="thermal__name">{clinic.name}</div>
        <div className="thermal__tag">{clinic.tagline}</div>
        {rs.showContact && (
          <div className="thermal__contact">
            <div>{clinic.address}</div>
            <div>{clinic.city}</div>
            <div>Tel: {clinic.phone}</div>
            <div>{clinic.mobile}</div>
            <div>{clinic.email}</div>
          </div>
        )}
      </div>

      <div className="thermal__rule thermal__rule--double" />
      <div className="thermal__title">{rs.header || 'PAYMENT RECEIPT'}</div>
      <div className="thermal__rule" />

      <Row label="Receipt #" value={bill.receiptNo} />
      <Row label="Date" value={formatDate(bill.createdAt)} />
      <Row label="Time" value={formatTime(bill.createdAt)} />
      <Row label="Token #" value={padToken(bill.tokenNo)} />
      <div className="thermal__rule" />
      <Row label="Patient" value={patient?.name} />
      <Row label="Patient ID" value={patient?.id} />
      {patient?.age != null && <Row label="Age/Gender" value={`${patient.age}y / ${patient.gender?.[0] || ''}`} />}
      <Row label="Category" value={CATEGORIES[bill.category]?.short || 'Regular'} />
      {doctor && <Row label="Doctor" value={doctor.name} />}
      <div className="thermal__rule" />

      <div className="thermal__section">CHARGES</div>
      <Row label="Consultation fee" value={money(bill.consultationFee)} />
      {bill.categoryWaiver > 0 && (
        <Row label={`  ${CATEGORIES[bill.category]?.short || ''} waiver`} value={`-${money(bill.categoryWaiver)}`} />
      )}

      {rs.showMedicineDetails && bill.medicines?.length > 0 && (
        <>
          <div className="thermal__section">CLINIC MEDICINES</div>
          {bill.medicines.map((m) => (
            <div key={m.medicineId + m.name} className="thermal__item">
              <div className="thermal__item-name">{m.name}</div>
              <Row label={`  ${m.qty} x ${money(m.unitPrice)}`} value={money(m.total)} />
            </div>
          ))}
        </>
      )}
      {!rs.showMedicineDetails && bill.medicineCharges > 0 && <Row label="Medicine charges" value={money(bill.medicineCharges)} />}

      {bill.additionalCharges?.length > 0 && (
        <>
          <div className="thermal__section">ADDITIONAL</div>
          {bill.additionalCharges.map((c, i) => (
            <Row key={i} label={c.label} value={money(c.amount)} />
          ))}
        </>
      )}

      <div className="thermal__rule" />
      <Row label="Subtotal" value={money(bill.subtotal)} />
      {bill.categoryWaiver > 0 && <Row label="Category waiver" value={`-${money(bill.categoryWaiver)}`} />}
      {manual > 0 && (
        <Row
          label={`Discount${bill.discount.type === 'percent' ? ` (${bill.discount.value}%)` : ''}`}
          value={`-${money(manual)}`}
        />
      )}
      {bill.totalDiscount > 0 && <Row label="Total discount" value={`-${money(bill.totalDiscount)}`} />}
      <div className="thermal__rule thermal__rule--double" />
      <Row label={`TOTAL (${cur})`} value={money(bill.total)} strong big />
      <div className="thermal__rule thermal__rule--double" />
      <Row label="Amount paid" value={money(bill.amountPaid)} strong />
      {bill.tendered > bill.total && <Row label="Cash tendered" value={money(bill.tendered)} />}
      {bill.change > 0 && <Row label="Change returned" value={money(bill.change)} />}
      {bill.balance > 0 && <Row label="Balance due" value={money(bill.balance)} strong />}
      <Row label="Payment method" value={method} />
      {bill.paymentRef && <Row label="Ref #" value={bill.paymentRef} />}
      <Row label="Status" value={(PAYMENT_STATUS[bill.paymentStatus]?.label || '').toUpperCase()} strong />

      {bill.total === 0 && <div className="thermal__stamp">*** NO CHARGE VISIT ***</div>}

      <div className="thermal__rule" />
      <div className="thermal__center thermal__thanks">{rs.footer}</div>
      {rs.note && <div className="thermal__center thermal__note">{rs.note}</div>}
      {visit?.consultation?.followUpDate && (
        <div className="thermal__center thermal__note">Follow-up: {formatDate(visit.consultation.followUpDate)}</div>
      )}
      <div className="thermal__rule" />
      <div className="thermal__meta">
        <span>Cashier: {cashier?.name || '—'}</span>
        <span>{visit?.id}</span>
      </div>
      <div className="thermal__barcode" aria-hidden>
        {bill.receiptNo.split('').map((ch, i) => (
          <span key={i} style={{ width: (ch.charCodeAt(0) % 3) + 1 }} />
        ))}
      </div>
      <div className="thermal__center thermal__powered">Software by Zaib Clinic CMS</div>
    </div>
  );
}
