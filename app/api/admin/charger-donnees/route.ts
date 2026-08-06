import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSessionTokenValid, SESSION_COOKIE } from "@/lib/auth";
import { CARNETS, SEANCES, SUIVIS, PARTICIPANTS } from "@/lib/donnees-profils";

// Route one-shot : remplace le carnet, les séances et les mesures de suivi de
// TOUS les participants par le jeu de données figé (profils) généré hors-ligne
// via scripts/generate-dataset.ts. Ne touche pas aux participants eux-mêmes.
// À retirer après usage.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return isSessionTokenValid(token);
}

// Insertion par petits lots : évite la limite de variables SQLite et les
// timeouts de passerelle sur un gros insert unique.
async function createInChunks<T>(
  rows: T[],
  create: (batch: T[]) => Promise<{ count: number }>,
  chunkSize: number
) {
  let count = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const res = await create(rows.slice(i, i + chunkSize));
    count += res.count;
  }
  return count;
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    // Conversion des dates (stockées en ISO string dans le fichier figé).
    const carnets = CARNETS.map((r) => ({
      ...r,
      date: new Date(r.date),
      createdAt: new Date(r.createdAt),
    }));
    const seances = SEANCES.map((r) => ({
      ...r,
      heureDebut: new Date(r.heureDebut as string),
      createdAt: new Date(r.createdAt as string),
    }));
    const suivis = SUIVIS.map((r) => ({ ...r, createdAt: new Date(r.createdAt as string) }));

    // On efface d'abord (les 3 tables référencent le participant, jamais l'inverse).
    await prisma.mesureSeance.deleteMany();
    await prisma.carnetJour.deleteMany();
    await prisma.mesureSuivi.deleteMany();

    // On s'assure que les 20 participants existent (sinon la clé étrangère saute).
    for (const p of PARTICIPANTS) {
      const data = { ...p, createdAt: new Date(p.createdAt) };
      await prisma.participant.upsert({
        where: { code: p.code },
        create: data as never,
        update: {
          groupe: p.groupe,
          sousGroupe: p.sousGroupe,
          age: p.age,
          sexe: p.sexe,
          createdAt: data.createdAt,
        } as never,
      });
    }

    const nCarnets = await createInChunks(
      carnets,
      (b) => prisma.carnetJour.createMany({ data: b as never }),
      100
    );
    const nSeances = await createInChunks(
      seances,
      (b) => prisma.mesureSeance.createMany({ data: b as never }),
      40
    );
    const nSuivis = await createInChunks(
      suivis,
      (b) => prisma.mesureSuivi.createMany({ data: b as never }),
      50
    );

    return NextResponse.json({ ok: true, carnets: nCarnets, seances: nSeances, suivis: nSuivis });
  } catch (e) {
    // Renvoie le vrai message d'erreur en JSON (sinon la route plante en 500 vide).
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
