// Délai avant la première consommation de nicotine APRÈS la séance de sport.
// Question posée en fin de questionnaire post-séance.

export const DELAI_CONSO_ITEMS = [
  { value: "MIN_15", label: "Dans les 15 minutes", labelCourt: "≤ 15 min", heures: 0.25 },
  { value: "MIN_30", label: "Dans les 30 minutes", labelCourt: "≤ 30 min", heures: 0.5 },
  { value: "PLUS_1H", label: "Plus d'1 heure après", labelCourt: "> 1 h", heures: 1.5 },
  { value: "AUCUNE", label: "Je n'ai pas consommé", labelCourt: "Aucune", heures: null },
] as const;

export type DelaiConso = (typeof DELAI_CONSO_ITEMS)[number]["value"];

export const DELAI_CONSO_VALUES = DELAI_CONSO_ITEMS.map((i) => i.value) as [
  DelaiConso,
  ...DelaiConso[],
];

export function labelDelaiConso(value: string | null | undefined): string {
  return DELAI_CONSO_ITEMS.find((i) => i.value === value)?.label ?? "—";
}
