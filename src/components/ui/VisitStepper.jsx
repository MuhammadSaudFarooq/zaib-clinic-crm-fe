import { Check } from 'lucide-react';
import { WORKFLOW_STEPS } from '@/data/constants';
import { cx } from '@/utils/format';

const CURRENT_INDEX = {
  waiting: 1,
  in_consultation: 2,
  pharmacy: 4,
  billing: 5,
  completed: 7,
  cancelled: -1,
};

/** Visual patient-journey tracker for one visit. */
export default function VisitStepper({ status, hasClinicMeds = true }) {
  const current = CURRENT_INDEX[status] ?? 1;
  return (
    <div className="stepper" aria-label="Visit progress">
      {WORKFLOW_STEPS.map((step, i) => {
        const done = current > i || (status === 'completed' && i <= 6);
        const isCurrent = current === i;
        const label = step.id === 'pharmacy' && !hasClinicMeds && current > i ? 'Dispensing (n/a)' : step.label;
        return (
          <div key={step.id} className={cx('stepper__step', done && 'is-done', isCurrent && 'is-current')}>
            <span className="stepper__dot">{done ? <Check size={15} strokeWidth={3} /> : i + 1}</span>
            <span className="stepper__label">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
