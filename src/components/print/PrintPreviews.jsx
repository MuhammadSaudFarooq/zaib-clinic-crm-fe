import { Printer } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useData } from '@/context/DataContext';
import { usePrint } from '@/context/PrintContext';
import PrescriptionDocument from './PrescriptionDocument';
import ThermalReceipt from './ThermalReceipt';

/* ------------------------- hooks ------------------------- */

export function usePrintPrescription() {
  const { state, lookup } = useData();
  const { print } = usePrint();
  return (visitId, type) => {
    const visit = lookup.visit[visitId];
    if (!visit) return;
    const patient = lookup.patient[visit.patientId];
    const doctor = lookup.staff[visit.doctorId];
    print(
      <PrescriptionDocument type={type} visit={visit} patient={patient} doctor={doctor} settings={state.settings} />,
      { format: 'a4', title: `${type === 'clinic' ? 'Clinic' : 'Store'} Prescription — ${patient?.name} — Token ${visit.tokenNo}` },
    );
  };
}

export function usePrintReceipt() {
  const { state, lookup } = useData();
  const { print } = usePrint();
  return (billId) => {
    const bill = lookup.bill[billId];
    if (!bill) return;
    const visit = lookup.visit[bill.visitId];
    print(
      <ThermalReceipt
        bill={bill}
        patient={lookup.patient[bill.patientId]}
        visit={visit}
        doctor={lookup.staff[visit?.doctorId]}
        cashier={lookup.staff[bill.createdBy]}
        settings={state.settings}
      />,
      { format: 'thermal', title: `Receipt ${bill.receiptNo}` },
    );
  };
}

/* ------------------------- modals ------------------------ */

export function PrescriptionPreviewModal({ open, onClose, visitId, type = 'clinic' }) {
  const { state, lookup } = useData();
  const printRx = usePrintPrescription();
  const visit = lookup.visit[visitId];
  if (!open || !visit) return null;
  const patient = lookup.patient[visit.patientId];
  const doctor = lookup.staff[visit.doctorId];
  const title = type === 'clinic' ? state.settings.prescription.clinicTitle : state.settings.prescription.storeTitle;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={`${title} — Preview`}
      subtitle="A4 layout · exactly what will be printed"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button icon={Printer} onClick={() => printRx(visitId, type)}>
            Print {type === 'clinic' ? 'Clinic' : 'Store'} Prescription
          </Button>
        </>
      }
    >
      <div className="paper-preview">
        <div className="paper-preview__sheet paper-preview__sheet--a4">
          <PrescriptionDocument type={type} visit={visit} patient={patient} doctor={doctor} settings={state.settings} />
        </div>
      </div>
    </Modal>
  );
}

export function ReceiptPreviewModal({ open, onClose, billId }) {
  const { state, lookup } = useData();
  const printReceipt = usePrintReceipt();
  const bill = lookup.bill[billId];
  if (!open || !bill) return null;
  const visit = lookup.visit[bill.visitId];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Receipt Preview"
      subtitle={`${bill.receiptNo} · 80mm thermal format`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button icon={Printer} onClick={() => printReceipt(billId)}>
            Print Receipt
          </Button>
        </>
      }
    >
      <div className="paper-preview paper-preview--thermal">
        <div className="paper-preview__sheet paper-preview__sheet--thermal">
          <ThermalReceipt
            bill={bill}
            patient={lookup.patient[bill.patientId]}
            visit={visit}
            doctor={lookup.staff[visit?.doctorId]}
            cashier={lookup.staff[bill.createdBy]}
            settings={state.settings}
          />
        </div>
      </div>
    </Modal>
  );
}
