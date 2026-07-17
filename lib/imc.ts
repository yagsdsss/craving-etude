/** IMC = poids(kg) / taille(m)². Renvoie null si poids ou taille manquant/invalide. */
export function computeImc(
  poids: number | null | undefined,
  tailleCm: number | null | undefined
): number | null {
  if (poids == null || tailleCm == null || tailleCm <= 0) return null;
  const m = tailleCm / 100;
  return Math.round((poids / (m * m)) * 10) / 10;
}
