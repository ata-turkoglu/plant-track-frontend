export type UnitLike = {
  id: number;
  code?: string | null;
  name?: string | null;
  symbol?: string | null;
};

export function formatUnitLabel(unit?: UnitLike | null): string {
  if (!unit) return '-';
  const nameOrCode = unit.name || unit.code || '-';
  return unit.symbol ? `${nameOrCode} (${unit.symbol})` : nameOrCode;
}
