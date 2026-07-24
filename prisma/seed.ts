import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { computeQsuScores, QSU_ITEMS } from "../lib/qsu";
import { computeFagerstromScore, FAGERSTROM_ITEMS } from "../lib/fagerstrom";
import { computeImc } from "../lib/imc";

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

        // QSU-Brief rempli en fin de séance (baisse avec la progression)
        const qsuBase = 5 - ((semaine - 1) / 5) * 2.5;
        const qsuAnswers = Object.fromEntries(
          QSU_ITEMS.map((item) => [
            item.key,
            chance(0.05) ? null : Math.round(clamp(qsuBase + randFloat(-1, 1), 1, 7)),
          ])
        );
        const qsuScores = computeQsuScores(qsuAnswers);

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
            ...qsuAnswers,
            ...qsuScores,
          },
        });
      }
    }
  }

  console.log("Génération du carnet quotidien...");
  for (const participant of participants) {
    const isExperimental = participant.groupe === "EXPERIMENTAL";
    const isP07 = participant.code === "P07";

    for (let semaine = 1; semaine <= 6; semaine++) {
      for (let jour = 0; jour < 7; jour++) {
        // P07: oublie plus souvent (20% au lieu de 4%), mais inconsistant
        const skipChance = isP07 ? 0.2 : 0.04;
        if (chance(skipChance)) continue; // journée non renseignée

        const date = new Date(studyStart);
        date.setUTCDate(date.getUTCDate() + (semaine - 1) * 7 + jour);

        const progression = (semaine - 1) / 5;

        // P07: consommation chaotique (stagne/remonte, pas de déclin régulier)
        let baseConso: number;
        if (isP07) {
          if (semaine <= 2) baseConso = 18;
          else if (semaine <= 3) baseConso = 20; // remonte
          else if (semaine === 4) baseConso = 19;
          else baseConso = 20; // stagne à 20, ne baisse pas vraiment
        } else {
          baseConso = isExperimental ? 20 - progression * 10 : 20 + randFloat(-2, 2);
        }
        const consoJour = clamp(baseConso + randFloat(-5, 5), 0, 40);

        const cigarettes = chance(0.08) ? null : Math.round(consoJour * 0.7);
        // % du goût puff utilisé dans la journée
        const puffPourcentage = chance(0.08)
          ? null
          : Math.round(clamp((isExperimental ? 6 - progression * 3 : 6) + randFloat(-2, 2), 0, 100));
        const snusSachets = chance(0.5) ? (chance(0.08) ? null : Math.round(consoJour * 0.05)) : 0;

        // P07: envie augmente après le sport mais stagne globalement
        let cravingBase: number;
        if (isP07) {
          // Craving élevé et peu de baisse sur 6 semaines
          if (semaine <= 2) cravingBase = 7;
          else if (semaine <= 4) cravingBase = 7.5;
          else cravingBase = 7.2; // remonte légèrement, stagne
        } else {
          cravingBase = isExperimental ? 6 - progression * 2.5 : 6 + randFloat(-0.5, 0.5);
        }
        const cravingMoyenJour = chance(0.06)
          ? null
          : Math.round(clamp(cravingBase + randFloat(-1, 1.5), 0, 10));

        await prisma.carnetJour.create({
          data: {
            participantCode: participant.code,
            date,
            cigarettes,
            puffPourcentage,
            snusSachets,
            cravingMoyenJour,
            evenementParticulier: isP07 && chance(0.15)
              ? pick([
                  "Envie plus forte après le sport.",
                  "Journée stressante, envie augmente.",
                  "Séance cardio, beaucoup d'envie après.",
                  "Muscu + envie forte, c'est lié?",
                ])
              : chance(0.06)
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

      const puffBase = isExperimental ? 5 - progression * 2 : 5 + randFloat(-1, 1);
      const cigBase = isExperimental ? 6 - progression * 3 : 6 + randFloat(-1, 1);
      const poidsBase = (isExperimental ? 78 - progression * 2 : 78) + randFloat(-8, 8);
      const tailleCm = Math.round((165 + randFloat(0, 25)) * 10) / 10; // ~165-190 cm
      const envieArreterBase = isExperimental ? 5 + progression * 3 : 5 + randFloat(-0.5, 0.5);
      const capaciteReduireBase = isExperimental ? 4 + progression * 4 : 4 + randFloat(-0.5, 0.5);

      // Test de Fagerström : réponses aléatoires (indices d'option), score calculé côté API/lib
      const fagerAnswers = Object.fromEntries(
        FAGERSTROM_ITEMS.map((item) => [
          item.key,
          chance(0.05) ? null : randInt(0, item.options.length - 1),
        ])
      );
      const scoreFagerstrom = computeFagerstromScore(fagerAnswers);
      const poids = chance(0.05) ? null : Math.round(poidsBase * 10) / 10;
      const imc = computeImc(poids, tailleCm);

      await prisma.mesureSuivi.create({
        data: {
          participantCode: participant.code,
          temps,
          consoPuffSemaine: chance(0.15) ? null : Math.round(clamp(puffBase + randFloat(-1, 1), 0, 20)),
          consoSnusSemaine: chance(0.6) ? null : randInt(0, 3),
          consoCigaretteSemaine: chance(0.2) ? null : Math.round(clamp(cigBase + randFloat(-1, 1), 0, 20)),
          poids,
          taille: tailleCm,
          imc,
          envieArreter: chance(0.05) ? null : Math.round(clamp(envieArreterBase + randFloat(-1, 1), 0, 10)),
          capaciteReduireConso: chance(0.05)
            ? null
            : Math.round(clamp(capaciteReduireBase + randFloat(-1, 1), 0, 10)),
          ...fagerAnswers,
          scoreFagerstrom,
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
