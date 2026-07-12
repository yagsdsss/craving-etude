export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function stdDev(values: number[]): number | null {
  if (values.length < 2) return null;
  const m = mean(values)!;
  const variance = values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/** Cohen's d pour deux mesures appariées (ex : craving avant/après). */
export function cohensDPaired(before: number[], after: number[]): number | null {
  const diffs = before.map((b, i) => after[i] - b).filter((d) => Number.isFinite(d));
  if (diffs.length < 2) return null;
  const m = mean(diffs)!;
  const sd = stdDev(diffs);
  if (!sd) return null;
  return m / sd;
}

/** Cohen's d pour deux groupes indépendants (ex : cardio vs musculation). */
export function cohensDIndependent(groupA: number[], groupB: number[]): number | null {
  if (groupA.length < 2 || groupB.length < 2) return null;
  const meanA = mean(groupA)!;
  const meanB = mean(groupB)!;
  const sdA = stdDev(groupA)!;
  const sdB = stdDev(groupB)!;
  const nA = groupA.length;
  const nB = groupB.length;
  const pooledSd = Math.sqrt(
    ((nA - 1) * sdA ** 2 + (nB - 1) * sdB ** 2) / (nA + nB - 2)
  );
  if (!pooledSd) return null;
  return (meanA - meanB) / pooledSd;
}

export function round(value: number | null, decimals = 2): number | null {
  if (value === null) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
