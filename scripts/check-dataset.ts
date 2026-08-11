/**
 * Contrôle des propriétés statistiques du jeu de données généré.
 * Usage : npx tsx scripts/check-dataset.ts
 */
import { SEANCES, CARNETS, PARTICIPANTS, SUIVIS } from "../lib/donnees-profils";
import { cohensDIndependent, mean, stdDev } from "../lib/stats";

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

const deltas = (m: string) =>
  SEANCES.filter((s) => s.modalite === m && s.deltaCraving !== null).map(
    (s) => s.deltaCraving as number
  );

const cardio = deltas("CARDIO");
const muscu = deltas("MUSCULATION");
const mc = mean(cardio)!;
const mm = mean(muscu)!;
const sc = stdDev(cardio)!;
const sm = stdDev(muscu)!;
const d = cohensDIndependent(muscu, cardio)!;

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

const ok =
  mc >= 0.25 && // cardio positif : barre visible, le sport augmente l'envie
  mm > mc && // musculation au-dessus
  d >= 0.25 &&
  d <= 0.48 && // effet modéré
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
    `T0hors[3-7]=${horsPlageT0.length}`
);
if (infractionsProduit.length) console.log("  ⚠", infractionsProduit.join(", "));
