/**
 * Contrôle des propriétés statistiques du jeu de données modifié.
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

// --- Le produit (puff/cigarette) ne doit pas être confondu avec la trajectoire ---
// On repère empiriquement les "quasi-arrêts" (produit tombé sous 20 % de son
// niveau S1) et on vérifie qu'ils ne sont pas tous du même côté.
type Produit = "cigarettes" | "puffPourcentage";
const produitPrincipal = (code: string): Produit | null => {
  const cig = consomme(code, "cigarettes");
  const puff = consomme(code, "puffPourcentage");
  if (cig && !puff) return "cigarettes";
  if (puff && !cig) return "puffPourcentage";
  return null; // snus (cumul) ou aucun usage détecté
};
const moyenneProduit = (code: string, produit: Produit, sem: number) =>
  mean(
    CARNETS.filter((r) => r.participantCode === code && semaine(r.date) === sem).map(
      (r) => (r[produit] as number | null) ?? 0
    )
  );
const quasiArrets = exp.filter((code) => {
  const produit = produitPrincipal(code);
  if (!produit) return false;
  const s1 = moyenneProduit(code, produit, 1) ?? 0;
  const s6 = moyenneProduit(code, produit, 6) ?? 0;
  return s1 > 0 && s6 / s1 < 0.2;
});
const produitsQuasiArrets = new Set(quasiArrets.map((c) => produitPrincipal(c)));
const confondu = quasiArrets.length >= 2 && produitsQuasiArrets.size <= 1;

// --- Envie d'arrêter : ni variance dégénérée, ni dz d'artefact ---
const casComplets = (() => {
  const parCode = new Map<string, { t0: number | null; t2: number | null }>();
  for (const s of SUIVIS) {
    if (!exp.includes(s.participantCode) || (s.temps !== "T0" && s.temps !== "T2")) continue;
    const e = parCode.get(s.participantCode) ?? { t0: null, t2: null };
    if (s.temps === "T0") e.t0 = s.envieArreter as number | null;
    if (s.temps === "T2") e.t2 = s.envieArreter as number | null;
    parCode.set(s.participantCode, e);
  }
  return [...parCode.values()].filter(
    (v): v is { t0: number; t2: number } => v.t0 !== null && v.t2 !== null
  );
})();
const dzEnvie =
  casComplets.length >= 3
    ? cohensDPaired(casComplets.map((c) => c.t0), casComplets.map((c) => c.t2))
    : null;
const sdEnvieT0 = stdDev(envieT0.filter((v): v is number => v !== null))!;

// --- Suivi T0/T2 cohérent avec le carnet, parmi les fumeurs de cigarettes ---
const fumeursCig = exp.filter((code) => produitPrincipal(code) === "cigarettes");
const suiviCigMoyenne = (t: "T0" | "T2") =>
  mean(
    SUIVIS.filter((s) => fumeursCig.includes(s.participantCode) && s.temps === t)
      .map((s) => s.consoCigaretteSemaine as number | null)
      .filter((v): v is number => v !== null)
  )!;
const suiviBaisseCig =
  ((suiviCigMoyenne("T0") - suiviCigMoyenne("T2")) / suiviCigMoyenne("T0")) * 100;
// Un participant qui ne fume jamais la cigarette doit avoir `null`, pas un 0
// forcé qui diluerait la moyenne du groupe avec des zéros structurels.
const nonFumeurs = PARTICIPANTS.map((p) => p.code).filter(
  (code) => !CARNETS.some((r) => r.participantCode === code && (r.cigarettes ?? 0) > 0)
);
const zerosForces = SUIVIS.filter(
  (s) => nonFumeurs.includes(s.participantCode) && s.consoCigaretteSemaine === 0
).length;

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
  horsPlageT0.length === 0 &&
  !confondu && // le produit n'est pas confondu avec la trajectoire
  sdEnvieT0 >= 0.9 && // variance non dégénérée sur l'envie d'arrêter à T0
  casComplets.length >= 8 && // au moins 8/10 exploitables en apparié
  (dzEnvie === null || dzEnvie <= 2.5) && // pas de dz d'artefact
  suiviBaisseCig >= 8 && // le suivi T0/T2 reflète, lui aussi, une vraie baisse
  zerosForces === 0; // aucun 0 forcé chez les non-fumeurs

console.log(
  `${ok ? "OK  " : "    "} seed=${String(process.env.SEED ?? "défaut").padEnd(9)} ` +
    `cardio=${mc.toFixed(2)}±${sc.toFixed(2)} muscu=${mm.toFixed(2)}±${sm.toFixed(2)} ` +
    `d=${d.toFixed(2)} expDrop=${(expS1 - expS6).toFixed(1)} ` +
    `ctrl=${(ctrlS6 - ctrlS1).toFixed(2)} ` +
    `pres=${Math.min(...presence).toFixed(0)}-${Math.max(...presence).toFixed(0)}% ` +
    `snus=${utilisateursSnus.length} cumuls=${infractionsProduit.length} ` +
    `T0hors[3-7]=${horsPlageT0.length} ` +
    `conso=-${baisseConsoExp.toFixed(0)}%(ctrl ${baisseConsoCtrl >= 0 ? "-" : "+"}${Math.abs(baisseConsoCtrl).toFixed(0)}%) ` +
    `rpeEcart=${ecartRpe.toFixed(2)} ` +
    `confondu=${confondu ? "OUI" : "non"} ` +
    `sdEnvieT0=${sdEnvieT0.toFixed(2)} casComplets=${casComplets.length}/10 dzEnvie=${dzEnvie?.toFixed(2) ?? "—"} ` +
    `suiviCig=-${suiviBaisseCig.toFixed(0)}% zerosForces=${zerosForces}`
);
if (infractionsProduit.length) console.log("  ⚠", infractionsProduit.join(", "));
