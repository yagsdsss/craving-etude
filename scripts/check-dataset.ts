/**
 * Contrôle des propriétés statistiques du jeu de données généré.
 * Usage : npx tsx scripts/check-dataset.ts
 */
import { SEANCES, CARNETS, PARTICIPANTS } from "../lib/donnees-profils";
import { cohensDIndependent, mean, stdDev } from "../lib/stats";

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
  Math.min(...presence) >= 60;

console.log(
  `${ok ? "OK  " : "    "} seed=${String(process.env.SEED ?? "défaut").padEnd(9)} ` +
    `cardio=${mc.toFixed(2)}±${sc.toFixed(2)} muscu=${mm.toFixed(2)}±${sm.toFixed(2)} ` +
    `d=${d.toFixed(2)} expDrop=${(expS1 - expS6).toFixed(1)} ` +
    `ctrl=${(ctrlS6 - ctrlS1).toFixed(2)} ` +
    `pres=${Math.min(...presence).toFixed(0)}-${Math.max(...presence).toFixed(0)}%`
);
