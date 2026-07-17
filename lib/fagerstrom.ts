// Test de Fagerström de dépendance à la nicotine (FTND, Heatherton et al., 1991), 6 items.
// Formulation adaptée à la nicotine (et non aux seules cigarettes) pour couvrir cigarette,
// puff et snus — à signaler comme adaptation dans le mémoire ; le barème vient de l'outil original.
// La réponse stockée (fager1..6) est l'INDICE de l'option choisie (0-based) ; le score = somme des points.

export type FagerstromItem = {
  key: `fager${number}`;
  texte: string;
  options: { label: string; points: number }[];
};

export const FAGERSTROM_ITEMS: FagerstromItem[] = [
  {
    key: "fager1",
    texte: "Combien de temps après votre réveil consommez-vous votre première dose de nicotine ?",
    options: [
      { label: "Dans les 5 minutes", points: 3 },
      { label: "6 à 30 minutes", points: 2 },
      { label: "31 à 60 minutes", points: 1 },
      { label: "Après 60 minutes", points: 0 },
    ],
  },
  {
    key: "fager2",
    texte: "Trouvez-vous difficile de vous abstenir de nicotine dans les endroits où c'est interdit ?",
    options: [
      { label: "Oui", points: 1 },
      { label: "Non", points: 0 },
    ],
  },
  {
    key: "fager3",
    texte: "À quelle prise de nicotine renonceriez-vous le plus difficilement ?",
    options: [
      { label: "La première de la journée", points: 1 },
      { label: "Une autre", points: 0 },
    ],
  },
  {
    key: "fager4",
    texte: "Combien de cigarettes (ou équivalent nicotine) consommez-vous par jour ?",
    options: [
      { label: "10 ou moins", points: 0 },
      { label: "11 à 20", points: 1 },
      { label: "21 à 30", points: 2 },
      { label: "31 ou plus", points: 3 },
    ],
  },
  {
    key: "fager5",
    texte:
      "Consommez-vous plus de nicotine durant les premières heures après le réveil que le reste de la journée ?",
    options: [
      { label: "Oui", points: 1 },
      { label: "Non", points: 0 },
    ],
  },
  {
    key: "fager6",
    texte: "Consommez-vous de la nicotine même lorsque vous êtes malade et alité(e) ?",
    options: [
      { label: "Oui", points: 1 },
      { label: "Non", points: 0 },
    ],
  },
];

/**
 * Score total de Fagerström (0-10) à partir des indices d'option choisis.
 * Renvoie null si aucun item n'est renseigné ; les items manquants comptent 0
 * uniquement si au moins un item est renseigné (choix conservateur, à documenter).
 */
export function computeFagerstromScore(answers: Record<string, unknown>): number | null {
  let anyAnswered = false;
  let total = 0;
  for (const item of FAGERSTROM_ITEMS) {
    const idx = answers[item.key];
    if (typeof idx !== "number") continue;
    anyAnswered = true;
    const opt = item.options[idx];
    if (opt) total += opt.points;
  }
  return anyAnswered ? total : null;
}
