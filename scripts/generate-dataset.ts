/**
 * Générateur HORS-LIGNE du jeu de données (côté développeur).
 *
 * Ce script définit des PROFILS de personnalité, génère des données cohérentes
 * et "humaines" (oublis, bruit, logique craving/consommation), puis écrit le
 * résultat figé dans `lib/donnees-profils.ts`.
 *
 * Le site ne fait ensuite QU'INSÉRER ce fichier — aucune génération à l'exécution.
 * Régénérer : `npx tsx scripts/generate-dataset.ts`
 */
import { writeFileSync } from "node:fs";
import { computeQsuScores, QSU_ITEMS } from "../lib/qsu";
import { computeFagerstromScore } from "../lib/fagerstrom";
import { computeImc } from "../lib/imc";

// ---------------------------------------------------------------------------
// RNG déterministe (résultat reproductible)
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260701);
const rand = (min: number, max: number) => rng() * (max - min) + min;
const randInt = (min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;
const chance = (p: number) => rng() < p;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const round1 = (v: number) => Math.round(v * 10) / 10;
const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];

// ---------------------------------------------------------------------------
// Participants (mêmes règles que le seed : P01..P20, pair=expérimental/A)
// ---------------------------------------------------------------------------
type Participant = {
  code: string;
  groupe: "EXPERIMENTAL" | "CONTROLE";
  sousGroupe: "A" | "B";
  age: number;
  sexe: "HOMME" | "FEMME" | "AUTRE";
};
// RNG dédié à l'âge/sexe pour ne PAS décaler le flux principal (données inchangées).
const rngDemo = mulberry32(4242);
const PARTICIPANTS: Participant[] = Array.from({ length: 20 }, (_, i) => ({
  code: `P${String(i + 1).padStart(2, "0")}`,
  groupe: i % 2 === 0 ? "EXPERIMENTAL" : "CONTROLE",
  sousGroupe: i % 2 === 0 ? "A" : "B",
  age: Math.floor(rngDemo() * 13) + 18, // 18..30
  sexe: rngDemo() < 0.5 ? "HOMME" : rngDemo() < 0.9 ? "FEMME" : "AUTRE",
}));

// ---------------------------------------------------------------------------
// PROFILS de personnalité
//   trajectoire : évolution de la consommation/craving sur 6 semaines
//     arret     -> arrête la nicotine vers la semaine 4 (conso -> 0)
//     reduction -> réduit progressivement, craving baisse un peu
//     lutte     -> dépendant, réduit à peine, craving reste haut
//     stable    -> aucune évolution (groupe contrôle)
//   oubli       : probabilité d'oublier de remplir un jour
//   dependance  : 0..1 -> niveau de craving de base + Fagerström
//   motivation  : 0..1 -> envie d'arrêter
//   capacite    : 0..1 -> capacité perçue à réduire
//   consoBase   : consommation de départ (équiv. cigarettes / jour)
//   weekend     : hausse du craving le week-end
// ---------------------------------------------------------------------------
type Trajectoire = "arret" | "reduction" | "lutte" | "stable";
type Profil = {
  id: string;
  nom: string;
  trajectoire: Trajectoire;
  oubli: number;
  dependance: number;
  motivation: number;
  capacite: number;
  consoBase: number;
  weekend: number;
  usePuff: boolean;
  useSnus: boolean;
};

const PROFILS: Record<string, Profil> = {
  // --- Expérimentaux ---
  motive: {
    id: "motive", nom: "Motivé qui décroche", trajectoire: "arret",
    oubli: 0.06, dependance: 0.45, motivation: 0.85, capacite: 0.8,
    consoBase: 14, weekend: 1.0, usePuff: true, useSnus: false,
  },
  regulier: {
    id: "regulier", nom: "Régulier persévérant", trajectoire: "reduction",
    oubli: 0.05, dependance: 0.5, motivation: 0.6, capacite: 0.6,
    consoBase: 16, weekend: 1.2, usePuff: false, useSnus: false,
  },
  lutte: {
    id: "lutte", nom: "Dépendant en lutte", trajectoire: "lutte",
    oubli: 0.13, dependance: 0.85, motivation: 0.4, capacite: 0.3,
    consoBase: 22, weekend: 1.5, usePuff: false, useSnus: true,
  },
  irregulier: {
    id: "irregulier", nom: "Irrégulier distrait", trajectoire: "reduction",
    oubli: 0.28, dependance: 0.55, motivation: 0.5, capacite: 0.45,
    consoBase: 17, weekend: 2.0, usePuff: true, useSnus: false,
  },
  weekendExp: {
    id: "weekendExp", nom: "Fumeur du week-end", trajectoire: "reduction",
    oubli: 0.1, dependance: 0.35, motivation: 0.65, capacite: 0.7,
    consoBase: 9, weekend: 2.5, usePuff: true, useSnus: false,
  },
  // --- Contrôles (craving stable, aucune baisse) ---
  stableAssidu: {
    id: "stableAssidu", nom: "Stable assidu", trajectoire: "stable",
    oubli: 0.05, dependance: 0.55, motivation: 0.4, capacite: 0.45,
    consoBase: 16, weekend: 1.2, usePuff: false, useSnus: false,
  },
  stableIrregulier: {
    id: "stableIrregulier", nom: "Stable irrégulier", trajectoire: "stable",
    oubli: 0.26, dependance: 0.6, motivation: 0.45, capacite: 0.5,
    consoBase: 18, weekend: 1.8, usePuff: true, useSnus: false,
  },
  grosFumeur: {
    id: "grosFumeur", nom: "Gros fumeur stable", trajectoire: "stable",
    oubli: 0.1, dependance: 0.9, motivation: 0.3, capacite: 0.25,
    consoBase: 24, weekend: 1.3, usePuff: false, useSnus: true,
  },
  weekendCtrl: {
    id: "weekendCtrl", nom: "Fumeur week-end stable", trajectoire: "stable",
    oubli: 0.15, dependance: 0.4, motivation: 0.5, capacite: 0.55,
    consoBase: 10, weekend: 2.5, usePuff: true, useSnus: false,
  },
  legerStable: {
    id: "legerStable", nom: "Léger stable", trajectoire: "stable",
    oubli: 0.08, dependance: 0.3, motivation: 0.55, capacite: 0.6,
    consoBase: 8, weekend: 1.5, usePuff: false, useSnus: false,
  },
};

// Attribution déterministe d'un profil à chaque participant.
// (P07 reste "dépendant en lutte" pour rester cohérent avec l'historique.)
const ASSIGNATION: Record<string, string> = {
  P01: "motive", P03: "regulier", P05: "weekendExp", P07: "lutte", P09: "motive",
  P11: "irregulier", P13: "regulier", P15: "lutte", P17: "motive", P19: "weekendExp",
  P02: "stableAssidu", P04: "stableIrregulier", P06: "grosFumeur", P08: "weekendCtrl",
  P10: "legerStable", P12: "stableAssidu", P14: "stableIrregulier", P16: "grosFumeur",
  P18: "weekendCtrl", P20: "legerStable",
};

// ---------------------------------------------------------------------------
// Modèles d'évolution
// ---------------------------------------------------------------------------
const STUDY_START = new Date("2026-07-01T00:00:00.000Z");

// Facteur de consommation (0..1) selon la trajectoire et la semaine (1..6).
function facteurConso(t: Trajectoire, semaine: number): number {
  const p = (semaine - 1) / 5; // 0..1
  switch (t) {
    case "arret": return clamp(1 - (semaine - 1) / 3, 0, 1); // 0 dès la semaine 4
    case "reduction": return 1 - 0.5 * p;
    case "lutte": return 1 - 0.12 * p;
    case "stable": return 1;
  }
}

// Décalage du craving selon la trajectoire et la semaine.
function tendanceCraving(t: Trajectoire, semaine: number): number {
  const p = (semaine - 1) / 5;
  switch (t) {
    case "arret": return -3.0 * clamp((semaine - 1) / 3, 0, 1);
    case "reduction": return -1.3 * p;
    case "lutte": return -0.4 * p;
    case "stable": return 0;
  }
}

// Réponses au Fagerström cohérentes avec la dépendance et la conso.
function fagerAnswers(dep: number, consoJour: number) {
  const bruit = () => rand(-0.4, 0.4);
  const bracket = consoJour <= 10 ? 0 : consoJour <= 20 ? 1 : consoJour <= 30 ? 2 : 3;
  return {
    fager1: chance(0.03) ? null : clamp(Math.round((1 - dep) * 3 + bruit()), 0, 3), // délai 1er usage
    fager2: chance(0.03) ? null : dep + bruit() > 0.45 ? 0 : 1,
    fager3: chance(0.03) ? null : dep + bruit() > 0.5 ? 0 : 1,
    fager4: chance(0.03) ? null : bracket,
    fager5: chance(0.03) ? null : dep + bruit() > 0.4 ? 0 : 1,
    fager6: chance(0.03) ? null : dep + bruit() > 0.6 ? 0 : 1,
  };
}

// ---------------------------------------------------------------------------
// Types de sortie (miroir des modèles Prisma)
// ---------------------------------------------------------------------------
type CarnetRow = {
  participantCode: string;
  date: string;
  cigarettes: number | null;
  puffPourcentage: number | null;
  snusSachets: number | null;
  cravingMoyenJour: number | null;
  evenementParticulier: string | null;
};
type SeanceRow = {
  participantCode: string;
  semaine: number;
  numeroSeance: number;
  modalite: "CARDIO" | "MUSCULATION";
  ordre: "PREMIERE" | "DEUXIEME";
  heureDebut: string;
  cravingAvant: number | null;
  cravingApres: number | null;
  deltaCraving: number | null;
  rpeReel: number | null;
  heuresDepuisDerniereConso: number | null;
  remarque: string | null;
} & Record<string, unknown>;
type SuiviRow = {
  participantCode: string;
  temps: "T0" | "T1" | "T2";
  consoPuffSemaine: number | null;
  consoSnusSemaine: number | null;
  consoCigaretteSemaine: number | null;
  poids: number | null;
  taille: number;
  imc: number | null;
  envieArreter: number | null;
  capaciteReduireConso: number | null;
} & Record<string, unknown>;

const CARNETS: CarnetRow[] = [];
const SEANCES: SeanceRow[] = [];
const SUIVIS: SuiviRow[] = [];

// ---------------------------------------------------------------------------
// Génération
// ---------------------------------------------------------------------------
for (const participant of PARTICIPANTS) {
  const profil = PROFILS[ASSIGNATION[participant.code]];
  const cravBase = 2.5 + profil.dependance * 5.5;

  // ----- Carnet quotidien (6 semaines) -----
  for (let semaine = 1; semaine <= 6; semaine++) {
    for (let jour = 0; jour < 7; jour++) {
      if (chance(profil.oubli)) continue; // oubli

      const date = new Date(STUDY_START);
      date.setUTCDate(date.getUTCDate() + (semaine - 1) * 7 + jour);
      const dow = date.getUTCDay();
      const weekend = dow === 0 || dow === 6;

      const facteur = facteurConso(profil.trajectoire, semaine);
      let consoJour = profil.consoBase * facteur * (weekend ? 1.15 : 1) + rand(-3, 3);
      if (profil.trajectoire === "arret" && facteur === 0) {
        consoJour = chance(0.12) ? rand(0, 3) : 0; // rare rechute après l'arrêt
      }
      consoJour = clamp(consoJour, 0, 40);

      let crav = cravBase + tendanceCraving(profil.trajectoire, semaine);
      if (weekend) crav += profil.weekend;
      if (consoJour < 0.5) crav -= 1.5; // l'arrêt soulage le manque
      crav += rand(-1, 1);

      CARNETS.push({
        participantCode: participant.code,
        date: date.toISOString(),
        cigarettes: chance(0.05) ? null : Math.round(consoJour * (profil.usePuff ? 0.7 : 0.9)),
        puffPourcentage: profil.usePuff
          ? chance(0.05) ? null : Math.round(clamp(4 * facteur + rand(-1.5, 1.5), 0, 100))
          : null,
        snusSachets: profil.useSnus ? Math.round(consoJour * 0.05) : 0,
        cravingMoyenJour: chance(0.05) ? null : Math.round(clamp(crav, 0, 10)),
        evenementParticulier: chance(0.07)
          ? pick(
              weekend
                ? ["Week-end, plus d'envie.", "Soirée entre amis, envie plus forte.", "Sortie, j'ai plus consommé."]
                : ["Journée stressante au travail.", "Journée calme.", "Grosse envie ce matin.", "Réunion tendue."]
            )
          : null,
      });
    }
  }

  // ----- Séances (groupe expérimental uniquement) -----
  if (participant.groupe === "EXPERIMENTAL") {
    const premiere = participant.sousGroupe === "A" ? "CARDIO" : "MUSCULATION";
    const deuxieme = participant.sousGroupe === "A" ? "MUSCULATION" : "CARDIO";

    for (let semaine = 1; semaine <= 6; semaine++) {
      for (const [numeroDansSemaine, ordre] of [
        [1, "PREMIERE"],
        [2, "DEUXIEME"],
      ] as const) {
        const numeroSeance = (semaine - 1) * 2 + numeroDansSemaine;
        const modalite = ordre === "PREMIERE" ? premiere : deuxieme;

        const cravAvantBase = cravBase + tendanceCraving(profil.trajectoire, semaine);
        const cravingAvant = chance(0.04)
          ? null
          : Math.round(clamp(cravAvantBase + rand(-1, 1), 0, 10));

        // Après la séance : la MUSCULATION fait monter l'envie, tandis que le
        // CARDIO la laisse globalement inchangée (delta centré sur 0).
        const delta = modalite === "MUSCULATION" ? rand(0.3, 2.5) : rand(-0.9, 0.9);
        const cravingApres =
          cravingAvant === null || chance(0.04)
            ? null
            : Math.round(clamp(cravingAvant + delta, 0, 10));

        const heureDebut = new Date(STUDY_START);
        heureDebut.setUTCDate(
          heureDebut.getUTCDate() + (semaine - 1) * 7 + (numeroDansSemaine - 1) * 3
        );
        heureDebut.setUTCHours(randInt(9, 19), chance(0.5) ? 0 : 30);

        // QSU (fin de séance) : suit le niveau de craving après la séance.
        const qsuBase = clamp((cravingApres ?? cravAvantBase) * 0.75, 1, 7);
        const qsuAnswers = Object.fromEntries(
          QSU_ITEMS.map((item) => [
            item.key,
            chance(0.04) ? null : Math.round(clamp(qsuBase + rand(-1, 1), 1, 7)),
          ])
        );
        const qsuScores = computeQsuScores(qsuAnswers);

        SEANCES.push({
          participantCode: participant.code,
          semaine,
          numeroSeance,
          modalite,
          ordre,
          heureDebut: heureDebut.toISOString(),
          cravingAvant,
          cravingApres,
          deltaCraving:
            cravingAvant !== null && cravingApres !== null ? cravingApres - cravingAvant : null,
          rpeReel: chance(0.04)
            ? null
            : Math.round(clamp((modalite === "MUSCULATION" ? 7 : 6.2) + rand(-1.3, 1.3), 0, 10)),
          heuresDepuisDerniereConso: round1(rand(0.5, 6)),
          remarque: chance(0.12)
            ? pick(["Séance difficile.", "Bonne énergie.", "Envie remontée après.", "Motivation ok."])
            : null,
          ...qsuAnswers,
          ...qsuScores,
        });
      }
    }
  }

  // ----- Mesures de suivi T0 / T1 / T2 -----
  const taille = round1(rand(162, 190));
  const poidsBase = 55 + profil.dependance * 8 + rand(0, 28);
  (["T0", "T1", "T2"] as const).forEach((temps, index) => {
    const semaineRef = [1, 3, 6][index];
    const consoDay = profil.consoBase * facteurConso(profil.trajectoire, semaineRef);
    const depAt =
      profil.trajectoire === "stable"
        ? profil.dependance
        : profil.dependance * (1 - 0.25 * index);
    const fagers = fagerAnswers(depAt, consoDay);
    const poids = chance(0.04) ? null : round1(poidsBase + rand(-1.5, 1.5) - index * 0.4);

    // Motivation/capacité : montent pour les expérimentaux, stables pour les contrôles.
    const bonusMotiv = profil.trajectoire === "stable" ? 0 : index * 1.5;

    SUIVIS.push({
      participantCode: participant.code,
      temps,
      consoCigaretteSemaine: chance(0.06) ? null : round1((consoDay * 7) / 20),
      consoPuffSemaine: profil.usePuff
        ? chance(0.1) ? null : round1(clamp(6 * facteurConso(profil.trajectoire, semaineRef) + rand(-1, 1), 0, 20))
        : null,
      consoSnusSemaine: profil.useSnus ? (chance(0.1) ? null : randInt(0, 3)) : null,
      poids,
      taille,
      imc: computeImc(poids, taille),
      envieArreter: chance(0.04) ? null : Math.round(clamp(profil.motivation * 10 + bonusMotiv + rand(-1, 1), 0, 10)),
      capaciteReduireConso: chance(0.04)
        ? null
        : Math.round(clamp(profil.capacite * 10 + bonusMotiv + rand(-1, 1), 0, 10)),
      ...fagers,
      scoreFagerstrom: computeFagerstromScore(fagers),
    });
  });
}

// ---------------------------------------------------------------------------
// Écriture du fichier figé
// ---------------------------------------------------------------------------
const header = `// FICHIER AUTO-GÉNÉRÉ par scripts/generate-dataset.ts — NE PAS ÉDITER À LA MAIN.
// Données figées des profils de participants. Régénérer : npx tsx scripts/generate-dataset.ts

export type CarnetRow = ${"{"}
  participantCode: string;
  date: string;
  cigarettes: number | null;
  puffPourcentage: number | null;
  snusSachets: number | null;
  cravingMoyenJour: number | null;
  evenementParticulier: string | null;
${"}"};

export type SeanceRow = Record<string, unknown> & { participantCode: string; heureDebut: string };
export type SuiviRow = Record<string, unknown> & { participantCode: string; temps: string };

export type ParticipantRow = {
  code: string;
  groupe: "EXPERIMENTAL" | "CONTROLE";
  sousGroupe: "A" | "B";
  age: number;
  sexe: "HOMME" | "FEMME" | "AUTRE";
};

export const PROFILS_ASSIGNES: Record<string, string> = ${JSON.stringify(ASSIGNATION, null, 2)};

export const PARTICIPANTS: ParticipantRow[] = ${JSON.stringify(PARTICIPANTS, null, 2)};

export const CARNETS: CarnetRow[] = ${JSON.stringify(CARNETS, null, 2)};

export const SEANCES: SeanceRow[] = ${JSON.stringify(SEANCES, null, 2)};

export const SUIVIS: SuiviRow[] = ${JSON.stringify(SUIVIS, null, 2)};
`;

writeFileSync("lib/donnees-profils.ts", header);

// ---------------------------------------------------------------------------
// Récap de vérification
// ---------------------------------------------------------------------------
const moy = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const carnetCrav = (pred: (r: CarnetRow) => boolean) =>
  moy(CARNETS.filter((r) => r.cravingMoyenJour !== null && pred(r)).map((r) => r.cravingMoyenJour!));

const weekendDays = CARNETS.filter((r) => {
  const d = new Date(r.date).getUTCDay();
  return d === 0 || d === 6;
});
const semaineDays = CARNETS.filter((r) => {
  const d = new Date(r.date).getUTCDay();
  return d !== 0 && d !== 6;
});

const seanceDelta = (mod: string) =>
  moy(SEANCES.filter((s) => s.modalite === mod && s.deltaCraving !== null).map((s) => s.deltaCraving as number));

console.log("=== Récap génération ===");
console.log(`Carnets: ${CARNETS.length} | Séances: ${SEANCES.length} | Suivis: ${SUIVIS.length}`);
console.log(
  `Craving moyen — week-end: ${carnetCrav((r) => weekendDays.includes(r)).toFixed(2)} | semaine: ${carnetCrav((r) => semaineDays.includes(r)).toFixed(2)} (le week-end doit être plus haut)`
);
console.log(
  `Delta séance — MUSCULATION: ${seanceDelta("MUSCULATION").toFixed(2)} | CARDIO: ${seanceDelta("CARDIO").toFixed(2)} (muscu doit être plus haut)`
);

// Trajectoire de craving expérimental vs contrôle (semaine 1 vs 6)
const cravSemaine = (codes: string[], sem: number) =>
  moy(
    CARNETS.filter((r) => {
      if (!codes.includes(r.participantCode) || r.cravingMoyenJour === null) return false;
      const jours = Math.round((new Date(r.date).getTime() - STUDY_START.getTime()) / 86400000);
      return Math.floor(jours / 7) + 1 === sem;
    }).map((r) => r.cravingMoyenJour!)
  );
const exp = PARTICIPANTS.filter((p) => p.groupe === "EXPERIMENTAL").map((p) => p.code);
const ctrl = PARTICIPANTS.filter((p) => p.groupe === "CONTROLE").map((p) => p.code);
console.log(
  `Expérimental craving — sem.1: ${cravSemaine(exp, 1).toFixed(2)} -> sem.6: ${cravSemaine(exp, 6).toFixed(2)} (doit baisser)`
);
console.log(
  `Contrôle craving — sem.1: ${cravSemaine(ctrl, 1).toFixed(2)} -> sem.6: ${cravSemaine(ctrl, 6).toFixed(2)} (doit rester stable)`
);

// Vérifie que les profils "arret" tombent à 0 vers la semaine 4+
const quitters = Object.entries(ASSIGNATION)
  .filter(([, id]) => PROFILS[id].trajectoire === "arret")
  .map(([code]) => code);
for (const code of quitters) {
  const sem56 = CARNETS.filter((r) => {
    if (r.participantCode !== code || r.cigarettes === null) return false;
    const jours = Math.round((new Date(r.date).getTime() - STUDY_START.getTime()) / 86400000);
    return Math.floor(jours / 7) + 1 >= 5;
  });
  const moyFin = moy(sem56.map((r) => r.cigarettes!));
  console.log(`  ${code} (arret) — cigarettes moy. sem.5-6: ${moyFin.toFixed(2)} (doit être ~0)`);
}
