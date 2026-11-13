import * as Yup from 'yup';

/** Treat empty inputs ('' / null) as "not provided" instead of NaN. */
const emptyToUndefined = (value, original) => (original === '' || original === null ? undefined : value);

/** Optional numeric field — empty is allowed, non-numbers are rejected. */
export const optionalNumber = (typeMessage = 'Enter a number') =>
  Yup.number().transform(emptyToUndefined).typeError(typeMessage);

/** Required numeric field — shows `requiredMessage` when left empty. */
export const requiredNumber = (requiredMessage, typeMessage = 'Enter a number') =>
  Yup.number().transform(emptyToUndefined).typeError(typeMessage).required(requiredMessage);

export const vitalsSchema = Yup.object({
  bp: Yup.string().matches(/^$|^\d{2,3}\/\d{2,3}$/, 'Format 120/80'),
  pulse: optionalNumber('Number').min(30, 'Too low').max(220, 'Too high'),
  temp: optionalNumber('Number').min(90, 'Too low').max(110, 'Too high'),
  weight: optionalNumber('Number').min(1, 'Too low').max(300, 'Too high'),
  spo2: optionalNumber('Number').min(50, 'Too low').max(100, 'Max 100'),
});
