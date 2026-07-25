import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { CARNETS, SEANCES, SUIVIS } from "../lib/donnees-profils";

const prisma = new PrismaClient();

// RNG à seed fixe pour que l'âge/le sexe des participants soient reproductibles.
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
const chance = (p: number) => rng() < p;

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

  // Le carnet, les séances et les mesures de suivi proviennent du jeu de données
  // figé (profils de personnalité), généré hors-ligne par scripts/generate-dataset.ts.
  console.log("Insertion des données des profils (carnet / séances / suivi)...");
  await prisma.carnetJour.createMany({
    data: CARNETS.map((r) => ({ ...r, date: new Date(r.date) })) as never,
  });
  await prisma.mesureSeance.createMany({
    data: SEANCES.map((r) => ({ ...r, heureDebut: new Date(r.heureDebut as string) })) as never,
  });
  await prisma.mesureSuivi.createMany({ data: SUIVIS as never });

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

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
