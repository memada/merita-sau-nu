import type { CalculatorInput } from './validation';
export function capacityForNight(night: number) {
  if (!Number.isFinite(night) || night < 0) throw new Error('Consum invalid');
  if (night < 4) return { min: 5, max: 5, label: '5 kWh' };
  if (night <= 8) return { min: 5, max: 10, label: '5–10 kWh' };
  if (night <= 12) return { min: 10, max: 15, label: '10–15 kWh' };
  return { min: 15, max: null, label: '15+ kWh' };
}
export function calculateBattery(input: CalculatorInput) {
  const estimated = input.nightConsumptionCategory === 'unknown';
  const night = estimated
    ? (input.monthlyConsumptionKwh / 30) * 0.45
    : ({ low: 3, medium: 6, high: 10, very_high: 15 } as const)[
        input.nightConsumptionCategory as 'low' | 'medium' | 'high' | 'very_high'
      ];
  const range = capacityForNight(night);
  const warnings: string[] = [];
  if (input.hasSolar === 'yes' && input.pvPowerKw! <= 3 && (range.max === null || range.max >= 10))
    warnings.push(
      'Capacitatea bateriei trebuie verificată și în raport cu producția și configurația sistemului fotovoltaic.',
    );
  if (range.max === null)
    warnings.push(
      'Pentru capacități mari recomandăm verificarea profilului real de consum înainte de achiziție.',
    );
  if (input.goal === 'backup' || input.goal === 'both')
    warnings.push(
      'Pentru backup trebuie verificată separat și puterea necesară, nu doar capacitatea în kWh.',
    );
  if (input.hasSolar !== 'yes')
    warnings.push(
      'Estimarea pornește de la consum. Producția viitorului sistem și energia disponibilă pentru încărcare trebuie verificate separat.',
    );
  return {
    recommendedBatteryMinKwh: range.min,
    recommendedBatteryMaxKwh: range.max,
    recommendationLabel: range.label,
    estimatedNightConsumptionKwh: Math.round(night * 10) / 10,
    calculationConfidence: estimated ? ('LOW' as const) : ('MEDIUM' as const),
    nightConsumptionEstimated: estimated,
    warnings,
  };
}
export type BatteryResult = ReturnType<typeof calculateBattery>;
