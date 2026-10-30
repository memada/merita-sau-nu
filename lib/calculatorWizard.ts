import { calculatorStepSchemas } from './validation';
export function firstInvalidStep(input: unknown, throughStep: number) {
  for (let step = 0; step <= Math.min(3, throughStep); step++) {
    const result = calculatorStepSchemas[step].safeParse(input);
    if (!result.success) return { step, message: result.error.issues[0].message };
  }
  return null;
}
