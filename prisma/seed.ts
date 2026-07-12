import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { computeQsuScores, QSU_ITEMS } from "../lib/qsu";

const prisma = new PrismaClient();

// RNG à seed fixe pour que les jeux de données de test soient reproductibles.
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

const rng = mulberry32(42);
const randInt = (min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;
const randFloat = (min: number, max: number, decimals = 1) => {
  const value = rng() * (max - min) + min;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};
const chance = (p: number) => rng() < p;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const PARTICIPANT_CODES = Array.from({ length: 20 }, (_, i) => `P${String(i + 1).padStart(2, "0")}`);

async function main() {
  console.log("Nettoyage des données existantes...");
  await prisma.mesureSeance.deleteMany();
  await prisma.carnetJour.deleteMany();
  await prisma.mesureSuivi.deleteMany();
  await prisma.participant.deleteMany();

  console.log("Création des participants...");
  const participants = PARTICIPANT_CODES.map((code, i) => ({
    code,
    groupe: i % 2 === 0 ? ("EXPERIMENTAL" as const) : ("CONTROLE" as const),
    sousGroupe: i % 2 === 0 ? ("A" as const) : ("B" as const),
    age: randInt(18, 30),
    sexe: chance(0.5) ? ("HOMME" as const) : chance(0.9) ? ("FEMME" as const) : ("AUTRE" as const),
  }));

  await prisma.participant.createMany({ data: participants });

  const studyStart = new Date("2026-01-05T00:00:00.000Z");

  console.log("Génération des séances (groupe expérimental uniquement)...");
  for (const participant of participants) {
    if (participant.groupe !== "EXPERIMENTAL") continue;

    const premiereModalite = participant.sousGroupe === "A" ? "CARDIO" : "MUSCULATION";
    const deuxiemeModalite = participant.sousGroupe === "A" ? "MUSCULATION" : "CARDIO";

    for (let semaine = 1; semaine <= 6; semaine++) {
      for (const [numeroDansSemaine, ordre] of [
        [1, "PREMIERE"],
        [2, "DEUXIEME"],
      ] as const) {
        const numeroSeance = (semaine - 1) * 2 + numeroDansSemaine;
        const modalite = ordre === "PREMIERE" ? premiereModalite : deuxiemeModalite;

        const progression = (semaine - 1) / 5; // 0 -> 1 sur les 6 semaines
        const cravingBase = clamp(7 - progression * 2 + randFloat(-1, 1), 1, 10);
        const cravingAvant = chance(0.05) ? null : Math.round(cravingBase);

        const reduction = clamp(
          2.5 + (modalite === "MUSCULATION" ? 0.3 : 0) + randFloat(-1, 1),
          0,
          cravingAvant ?? 5
        );
        const cravingApres =
          chance(0.05) || cravingAvant === null
            ? null
            : Math.round(clamp(cravingAvant - reduction, 0, 10));

        const rpeReel = chance(0.05)
          ? null
          : Math.round(clamp(6 + (modalite === "MUSCULATION" ? 0.2 : 0) + randFloat(-1.2, 1.2), 0, 10));

        const heureDebut = new Date(studyStart);
        heureDebut.setUTCDate(heureDebut.getUTCDate() + (semaine - 1) * 7 + (numeroDansSemaine - 1) * 3);
        heureDebut.setUTCHours(randInt(9, 19), chance(0.5) ? 0 : 30);

        await prisma.mesureSeance.create({
          data: {
            participantCode: participant.code,
            semaine,
            numeroSeance,
            modalite,
            ordre,
            heureDebut,
            cravingAvant,
            cravingApres,
            deltaCraving:
              cravingAvant !== null && cravingApres !== null ? cravingApres - cravingAvant : null,
            rpeReel,
            heuresDepuisDerniereConso: chance(0.1) ? null : randFloat(0.5, 6, 1),
            remarque: chance(0.12)
              ? pick(["Séance difficile aujourd'hui.", "Bonne énergie.", "Léger mal de tête avant.", "Motivation en baisse."])
              : null,
          },
        });
      }
    }
  }

  console.log("Génération du carnet quotidien...");
  for (const participant of participants) {
    const isExperimental = participant.groupe === "EXPERIMENTAL";

    for (let semaine = 1; semaine <= 6; semaine++) {
      for (let jour = 0; jour < 7; jour++) {
        if (chance(0.04)) continue; // journée non renseignée

        const date = new Date(studyStart);
        date.setUTCDate(date.getUTCDate() + (semaine - 1) * 7 + jour);

        const progression = (semaine - 1) / 5;
        const baseConso = isExperimental ? 20 - progression * 10 : 20 + randFloat(-2, 2);
        const consoJour = clamp(baseConso + randFloat(-4, 4), 0, 40);

        const cigarettes = chance(0.08) ? null : Math.round(consoJour * 0.7);
        const puffPrises = chance(0.08) ? null : Math.round(consoJour * 0.2);
        const snusSachets = chance(0.5) ? (chance(0.08) ? null : Math.round(consoJour * 0.05)) : 0;

        const cravingBase = isExperimental ? 6 - progression * 2.5 : 6 + randFloat(-0.5, 0.5);
        const cravingMoyenJour = chance(0.06)
          ? null
          : Math.round(clamp(cravingBase + randFloat(-1, 1), 0, 10));

        await prisma.carnetJour.create({
          data: {
            participantCode: participant.code,
            date,
            cigarettes,
            puffPrises,
            snusSachets,
            cravingMoyenJour,
            evenementParticulier: chance(0.06)
              ? pick(["Soirée entre amis, envie plus forte.", "Journée stressante au travail.", "Journée calme, pas d'envie particulière."])
              : null,
          },
        });
      }
    }
  }

  console.log("Génération des mesures de suivi T0/T1/T2...");
  for (const participant of participants) {
    const isExperimental = participant.groupe === "EXPERIMENTAL";

    for (const [index, temps] of (["T0", "T1", "T2"] as const).entries()) {
      const progression = index / 2; // 0, 0.5, 1

      const fagerstromBase = isExperimental ? 6 - progression * 2 : 6 + randFloat(-0.3, 0.3);
      const qsuBase = isExperimental ? 5 - progression * 2.5 : 5 + randFloat(-0.3, 0.3);
      const consoBase = isExperimental ? 110 - progression * 50 : 110 + randFloat(-5, 5);
      const test6minBase = isExperimental ? 540 + progression * 60 : 540 + randFloat(-10, 10);
      const poidsBase = (isExperimental ? 78 - progression * 2 : 78) + randFloat(-8, 8);
      const tourTailleBase = (isExperimental ? 88 - progression * 2 : 88) + randFloat(-6, 6);
      const envieArreterBase = isExperimental ? 5 + progression * 3 : 5 + randFloat(-0.5, 0.5);
      const capaciteReduireBase = isExperimental ? 4 + progression * 4 : 4 + randFloat(-0.5, 0.5);

      const qsuAnswers = Object.fromEntries(
        QSU_ITEMS.map((item) => [
          item.key,
          chance(0.05) ? null : Math.round(clamp(qsuBase + randFloat(-1, 1), 1, 7)),
        ])
      );
      const qsuScores = computeQsuScores(qsuAnswers);

      await prisma.mesureSuivi.create({
        data: {
          participantCode: participant.code,
          temps,
          scoreFagerstrom: chance(0.05) ? null : Math.round(clamp(fagerstromBase + randFloat(-0.5, 0.5), 0, 10)),
          consoMoyenneSemaine: chance(0.05) ? null : Math.round(clamp(consoBase, 0, 200)),
          test6min: chance(0.08) ? null : Math.round(clamp(test6minBase, 300, 800)),
          poids: chance(0.05) ? null : Math.round(poidsBase * 10) / 10,
          imc: chance(0.05) ? null : Math.round((poidsBase / (1.75 * 1.75)) * 10) / 10,
          tourTaille: chance(0.08) ? null : Math.round(tourTailleBase * 10) / 10,
          envieArreter: chance(0.05) ? null : Math.round(clamp(envieArreterBase + randFloat(-1, 1), 0, 10)),
          capaciteReduireConso: chance(0.05)
            ? null
            : Math.round(clamp(capaciteReduireBase + randFloat(-1, 1), 0, 10)),
          ...qsuAnswers,
          ...qsuScores,
        },
      });
    }
  }

  const [nParticipants, nSeances, nCarnets, nSuivis] = await Promise.all([
    prisma.participant.count(),
    prisma.mesureSeance.count(),
    prisma.carnetJour.count(),
    prisma.mesureSuivi.count(),
  ]);

  console.log(
    `Terminé : ${nParticipants} participants, ${nSeances} séances, ${nCarnets} carnets, ${nSuivis} mesures de suivi.`
  );
}

function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
