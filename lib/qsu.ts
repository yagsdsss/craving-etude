// QSU-Brief (Cox, Tiffany & Christen, 2001) — 10 items, échelle 1 (pas du tout d'accord) à 7 (tout à fait d'accord).
// Traduction non officielle : à vérifier avec la version française validée que tu cites dans ton mémoire
// avant utilisation en collecte réelle (l'ordre et le regroupement en facteurs viennent de l'article original).

export const QSU_ITEMS: { key: `qsu${number}`; texte: string }[] = [
  { key: "qsu1", texte: "J'ai envie d'une cigarette en ce moment." },
  { key: "qsu2", texte: "Rien ne serait meilleur que de fumer une cigarette en ce moment." },
  { key: "qsu3", texte: "Si c'était possible, je fumerais probablement maintenant." },
  { key: "qsu4", texte: "Je contrôlerais mieux les choses en ce moment si je pouvais fumer." },
  { key: "qsu5", texte: "Tout ce que je veux en ce moment, c'est une cigarette." },
  { key: "qsu6", texte: "J'ai une envie pressante de fumer une cigarette." },
  { key: "qsu7", texte: "Une cigarette aurait bon goût en ce moment." },
  { key: "qsu8", texte: "Je ferais presque n'importe quoi pour une cigarette en ce moment." },
  { key: "qsu9", texte: "Fumer me rendrait moins déprimé(e)." },
  { key: "qsu10", texte: "Je vais fumer dès que possible." },
];

const FACTEUR_1 = ["qsu1", "qsu3", "qsu6", "qsu7", "qsu9"] as const;
const FACTEUR_2 = ["qsu2", "qsu4", "qsu5", "qsu8", "qsu10"] as const;

function moyenne(values: (number | null | undefined)[]): number | null {
  const present = values.filter((v): v is number => v !== null && v !== undefined);
  if (present.length === 0) return null;
  return Math.round((present.reduce((a, b) => a + b, 0) / present.length) * 100) / 100;
}

export function computeQsuScores(items: Record<string, number | null | undefined>) {
  const all = QSU_ITEMS.map((i) => items[i.key]);
  const f1 = FACTEUR_1.map((k) => items[k]);
  const f2 = FACTEUR_2.map((k) => items[k]);

  return {
    scoreCravingTrait: moyenne(all),
    qsuFacteur1: moyenne(f1),
    qsuFacteur2: moyenne(f2),
  };
}
