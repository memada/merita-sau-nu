import { z } from 'zod';
import {
  backupOptions,
  budgetLabels,
  counties,
  goalLabels,
  inverterBrands,
  nightLabels,
  solarLabels,
  timelineLabels,
  statusLabels,
} from './options';
import { normalizePhone } from './phone';
export const cleanText = (text: string) =>
  text
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .trim();
const text = (max: number) =>
  z.string().max(max, `Folosește maximum ${max} de caractere.`).transform(cleanText);
const enumKeys = <T extends Record<string, string>>(obj: T) =>
  Object.keys(obj) as [keyof T & string, ...(keyof T & string)[]];
const calculatorFieldsSchema = z.object({
  hasSolar: z.enum(enumKeys(solarLabels), {
    error: 'Selectează situația sistemului fotovoltaic.',
  }),
  pvPowerKw: z.number().min(1, 'Puterea trebuie să fie între 1 și 100 kW.').max(100).optional(),
  inverterBrand: z.enum(inverterBrands).default('Nu știu'),
  inverterModel: text(150).default(''),
  monthlyConsumptionKwh: z
    .number({ error: 'Introdu consumul lunar.' })
    .min(50, 'Consumul trebuie să fie între 50 și 5.000 kWh.')
    .max(5000, 'Consumul trebuie să fie între 50 și 5.000 kWh.'),
  nightConsumptionCategory: z.enum(enumKeys(nightLabels)),
  goal: z.enum(enumKeys(goalLabels)),
  backupLoads: z.array(z.enum(backupOptions)).max(7).default([]),
  budgetRange: z.enum(enumKeys(budgetLabels)),
  purchaseTimeline: z.enum(enumKeys(timelineLabels)),
});
function requireSolarPower(value: { hasSolar: string; pvPowerKw?: number }, ctx: z.RefinementCtx) {
  if (value.hasSolar === 'yes' && value.pvPowerKw === undefined)
    ctx.addIssue({
      code: 'custom',
      path: ['pvPowerKw'],
      message: 'Introdu puterea sistemului, între 1 și 100 kW.',
    });
}
export const calculatorSchema = calculatorFieldsSchema.superRefine(requireSolarPower);
// Validate each step independently: missing fields on later steps must not suppress
// the conditional PV check on step 1.
export const calculatorStepSchemas = [
  calculatorFieldsSchema
    .pick({ hasSolar: true, pvPowerKw: true, inverterBrand: true, inverterModel: true })
    .superRefine(requireSolarPower),
  calculatorFieldsSchema.pick({ monthlyConsumptionKwh: true, nightConsumptionCategory: true }),
  calculatorFieldsSchema.pick({ goal: true, backupLoads: true }),
  calculatorFieldsSchema.pick({ budgetRange: true, purchaseTimeline: true }),
];
export const calculatorDraftSchema = calculatorFieldsSchema.partial();
export type CalculatorInput = z.infer<typeof calculatorSchema>;
export const contactSchema = z.object({
  county: z.enum(counties, { error: 'Selectează județul.' }),
  city: text(100).pipe(z.string().min(2, 'Introdu localitatea.')),
  homeOwner: z.boolean({ error: 'Selectează dacă ești proprietarul locuinței.' }),
  name: text(120).pipe(z.string().min(2, 'Introdu numele.')),
  phone: z
    .string()
    .max(30)
    .transform((v) => normalizePhone(v))
    .refine((v) => v !== null, 'Introdu un număr de telefon valid.')
    .transform((v) => v!),
  email: z
    .union([z.literal(''), z.email('Introdu o adresă de email validă.').max(254)])
    .optional()
    .default(''),
  notes: text(2000).default(''),
  consentGiven: z.literal(true, {
    error: 'Trebuie să fii de acord cu transmiterea datelor pentru a putea solicita oferte.',
  }),
});
export const attributionSchema = z.object({
  source: text(200).default('direct'),
  utmSource: text(200).default(''),
  utmMedium: text(200).default(''),
  utmCampaign: text(200).default(''),
  utmContent: text(200).default(''),
  utmTerm: text(200).default(''),
  landingPage: text(1000).default(''),
  referrer: text(1000).default(''),
});
export const leadSchema = z.object({
  calculator: calculatorSchema,
  contact: contactSchema,
  attribution: attributionSchema.default(() => attributionSchema.parse({})),
  website: z.string().max(200).default(''),
});
export const adminUpdateSchema = z.object({
  status: z.enum(enumKeys(statusLabels)),
  internalNotes: text(10000),
});
export type LeadSubmission = z.infer<typeof leadSchema>;
