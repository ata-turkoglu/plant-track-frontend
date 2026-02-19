export type UnitLike = {
  id: number;
  code?: string | null;
  name?: string | null;
  symbol?: string | null;
};

export type UnitLabelLike = {
  code?: string | null;
  name?: string | null;
  symbol?: string | null;
};

export function formatUnitLabel(unit?: UnitLike | null): string {
  if (!unit) return '-';
  const nameOrCode = unit.name || unit.code || '-';
  return unit.symbol ? `${nameOrCode} (${unit.symbol})` : nameOrCode;
}

export function formatUnitLabelWithName(
  unit: UnitLabelLike | null | undefined,
  translatedName?: string,
  translatedSymbol?: string
): string {
  if (!unit) return '-';
  const nameOrCode = translatedName || unit.name || unit.code || '-';
  const symbolToUse = (translatedSymbol ?? unit.symbol ?? '').trim();
  if (!symbolToUse) return nameOrCode;

  const normalizedSymbol = symbolToUse.toLowerCase();
  const normalizedName = nameOrCode.trim().toLowerCase();
  const normalizedRawName = (unit.name ?? '').trim().toLowerCase();

  // Avoid mixed-language/redundant labels like "Piece (adet)" when symbol mirrors raw unit name.
  if (normalizedSymbol === normalizedName || (normalizedRawName && normalizedSymbol === normalizedRawName)) {
    return nameOrCode;
  }

  return `${nameOrCode} (${symbolToUse})`;
}
