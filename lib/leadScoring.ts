import type { CalculatorInput } from './validation';
export function scoreLead(input: {
  homeOwner: boolean;
  purchaseTimeline: CalculatorInput['purchaseTimeline'];
  budgetRange: CalculatorInput['budgetRange'];
  hasSolar: CalculatorInput['hasSolar'];
  county: string;
  phoneValid: boolean;
  calculatorCompleted: boolean;
}) {
  const timelinePoints = {
    asap: 25,
    '30_days': 20,
    '1_3_months': 15,
    '3_6_months': 5,
    research: 0,
  };
  const leadScore = Math.min(
    100,
    (input.homeOwner ? 20 : 0) +
      timelinePoints[input.purchaseTimeline] +
      (input.budgetRange !== 'unknown' ? 15 : 0) +
      (input.hasSolar === 'yes' ? 10 : 0) +
      (input.county ? 5 : 0) +
      (input.phoneValid ? 15 : 0) +
      (input.calculatorCompleted ? 10 : 0),
  );
  return {
    leadScore,
    leadCategory:
      leadScore >= 70 ? ('HOT' as const) : leadScore >= 45 ? ('WARM' as const) : ('COLD' as const),
  };
}
