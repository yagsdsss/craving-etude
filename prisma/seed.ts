import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { CARNETS, SEANCES, SUIVIS, PARTICIPANTS } from "../lib/donnees-profils";

const prisma = new PrismaClient();

async function main() {
  console.log("Nettoyage des données existantes...");
  await prisma.mesureSeance.deleteMany();
  await prisma.carnetJour.deleteMany();
  await prisma.mesureSuivi.deleteMany();
  await prisma.participant.deleteMany();

  // Tout provient du jeu de données figé (profils), généré hors-ligne par
  // scripts/generate-dataset.ts — même source que la route admin, zéro divergence.
  console.log("Création des participants...");
  await prisma.participant.createMany({
    data: PARTICIPANTS.map((r) => ({ ...r, createdAt: new Date(r.createdAt) })) as never,
  });

  console.log("Insertion des données des profils (carnet / séances / suivi)...");
  await prisma.carnetJour.createMany({
    data: CARNETS.map((r) => ({
      ...r,
      date: new Date(r.date),
      createdAt: new Date(r.createdAt),
    })) as never,
  });
  await prisma.mesureSeance.createMany({
    data: SEANCES.map((r) => ({
      ...r,
      heureDebut: new Date(r.heureDebut as string),
      createdAt: new Date(r.createdAt as string),
    })) as never,
  });
  await prisma.mesureSuivi.createMany({
    data: SUIVIS.map((r) => ({ ...r, createdAt: new Date(r.createdAt as string) })) as never,
  });

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
