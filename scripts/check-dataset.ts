/**
 * Contrôle des propriétés statistiques du jeu de données généré.
 * Usage : npx tsx scripts/check-dataset.ts
 */
import { SEANCES, CARNETS, PARTICIPANTS, SUIVIS } from "../lib/donnees-profils";
import { cohensDPaired, mean, stdDev } from "../lib/stats";

// --- Règles produits : puff OU cigarette, sauf consommateurs de snus (3 max) ---
const consomme = (code: string, champ: "cigarettes" | "puffPourcentage" | "snusSachets") =>
  CARNETS.some((r) => r.participantCode === code && ((r[champ] as number | null) ?? 0) > 0);

const infractionsProduit: string[] = [];
const utilisateursSnus: string[] = [];
for (const p of PARTICIPANTS) {
  const puff = consomme(p.code, "puffPourcentage");
  const cig = consomme(p.code, "cigarettes");
  const snus = consomme(p.code, "snusSachets");
  if (snus) utilisateursSnus.push(p.code);
  // Sans snus, le cumul puff + cigarette est interdit.
  if (!snus && puff && cig) infractionsProduit.push(`${p.code} cumule puff+cigarette`);
}

// --- Envie d'arrêter à l'inclusion : tout le monde entre 3 et 7 ---
const envieT0 = SUIVIS.filter((s) => s.temps === "T0").map((s) => s.envieArreter as number | null);
const horsPlageT0 = envieT0.filter((v) => v !== null && (v < 3 || v > 7));

// Moyenne par participant : les séances d'un même participant ne sont pas des
// observations indépendantes (même logique que le tableau de bord).
const parParticipant = (m: string, champ: "deltaCraving" | "rpeReel") => {
  const acc = new Map<string, { t: number; n: number }>();
  for (const s of SEANCES) {
    if (s.modalite !== m || s[champ] === null || s[champ] === undefined) continue;
    const code = s.participantCode;
    const a = acc.get(code) ?? { t: 0, n: 0 };
    a.t += s[champ] as number;
    a.n += 1;
    acc.set(code, a);
  }
  return new Map([...acc].map(([c, { t, n }]) => [c, t / n]));
};

const cardioMap = parParticipant("CARDIO", "deltaCraving");
const muscuMap = parParticipant("MUSCULATION", "deltaCraving");
const codesApparies = [...cardioMap.keys()].filter((c) => muscuMap.has(c));

const cardio = [...cardioMap.values()];
const muscu = [...muscuMap.values()];
const mc = mean(cardio)!;
const mm = mean(muscu)!;
const sc = stdDev(cardio)!;
const sm = stdDev(muscu)!;
// dz apparié, comme affiché sur le tableau de bord.
const d = cohensDPaired(
  codesApparies.map((c) => cardioMap.get(c)!),
  codesApparies.map((c) => muscuMap.get(c)!)
)!;

// Écart de RPE entre modalités : doit rester faible (contrôle de validité).
const rpeCardio = mean([...parParticipant("CARDIO", "rpeReel").values()])!;
const rpeMuscu = mean([...parParticipant("MUSCULATION", "rpeReel").values()])!;
const ecartRpe = Math.abs(rpeMuscu - rpeCardio);

const exp = PARTICIPANTS.filter((p) => p.groupe === "EXPERIMENTAL").map((p) => p.code);
const START = new Date("2026-07-01T00:00:00.000Z");
const semaine = (iso: string) =>
  Math.min(6, Math.floor((new Date(iso).getTime() - START.getTime()) / 86400000 / 7) + 1);

const cravings = CARNETS.filter((r) => r.cravingMoyenJour !== null);
const moyenneSi = (f: (r: (typeof cravings)[number]) => boolean) =>
  mean(cravings.filter(f).map((r) => r.cravingMoyenJour as number))!;

const expS1 = moyenneSi((r) => exp.includes(r.participantCode) && semaine(r.date) === 1);
const expS6 = moyenneSi((r) => exp.includes(r.participantCode) && semaine(r.date) === 6);
const ctrlS1 = moyenneSi((r) => !exp.includes(r.participantCode) && semaine(r.date) === 1);
const ctrlS6 = moyenneSi((r) => !exp.includes(r.participantCode) && semaine(r.date) === 6);
const weekend = moyenneSi((r) => [0, 6].includes(new Date(r.date).getUTCDay()));
const semaineJours = moyenneSi((r) => ![0, 6].includes(new Date(r.date).getUTCDay()));
const presence = exp.map(
  (code) => (SEANCES.filter((s) => s.participantCode === code).length / 12) * 100
);

// Consommation équivalent-cigarette par jour (cigarettes + puff converti + snus),
// pour vérifier que la baisse sur 6 semaines reste plausible.
const CIG_PAR_POURCENT_PUFF = 0.5;
const consoJour = (r: (typeof CARNETS)[number]) =>
  (r.cigarettes ?? 0) + (r.puffPourcentage ?? 0) * CIG_PAR_POURCENT_PUFF + (r.snusSachets ?? 0);
const consoSemaine = (codes: string[], sem: number) =>
  mean(
    CARNETS.filter((r) => codes.includes(r.participantCode) && semaine(r.date) === sem).map(
      consoJour
    )
  )!;
const ctrl = PARTICIPANTS.filter((p) => p.groupe === "CONTROLE").map((p) => p.code);
const baisseConsoExp =
  ((consoSemaine(exp, 1) - consoSemaine(exp, 6)) / consoSemaine(exp, 1)) * 100;
const baisseConsoCtrl =
  ((consoSemaine(ctrl, 1) - consoSemaine(ctrl, 6)) / consoSemaine(ctrl, 1)) * 100;

const ok =
  mc >= 0.25 && // cardio positif : barre visible, le sport augmente l'envie
  mm > mc && // musculation au-dessus
  d >= 0.15 &&
  d <= 0.40 && // effet faible à modéré
  mm - mc <= 0.45 && // écart entre modalités resserré
  ecartRpe <= 0.55 && // intensités perçues comparables
  baisseConsoExp >= 15 &&
  baisseConsoExp <= 35 && // réduction sensible, sans effondrement
  Math.abs(baisseConsoCtrl) < 8 && // le contrôle reste stable
  mc + sc > mm - sm && // barres d'erreur qui se chevauchent
  weekend > semaineJours &&
  expS1 - expS6 >= 1.2 &&
  expS1 - expS6 <= 2.6 &&
  Math.abs(ctrlS6 - ctrlS1) < 0.6 &&
  Math.min(...presence) >= 60 &&
  infractionsProduit.length === 0 &&
  utilisateursSnus.length <= 3 &&
  horsPlageT0.length === 0;

console.log(
  `${ok ? "OK  " : "    "} seed=${String(process.env.SEED ?? "défaut").padEnd(9)} ` +
    `cardio=${mc.toFixed(2)}±${sc.toFixed(2)} muscu=${mm.toFixed(2)}±${sm.toFixed(2)} ` +
    `d=${d.toFixed(2)} expDrop=${(expS1 - expS6).toFixed(1)} ` +
    `ctrl=${(ctrlS6 - ctrlS1).toFixed(2)} ` +
    `pres=${Math.min(...presence).toFixed(0)}-${Math.max(...presence).toFixed(0)}% ` +
    `snus=${utilisateursSnus.length} cumuls=${infractionsProduit.length} ` +
    `T0hors[3-7]=${horsPlageT0.length} ` +
    `conso=-${baisseConsoExp.toFixed(0)}%(ctrl ${baisseConsoCtrl >= 0 ? "-" : "+"}${Math.abs(baisseConsoCtrl).toFixed(0)}%) ` +
    `rpeEcart=${ecartRpe.toFixed(2)}`
);
if (infractionsProduit.length) console.log("  ⚠", infractionsProduit.join(", "));
