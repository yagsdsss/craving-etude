import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSessionTokenValid, SESSION_COOKIE } from "@/lib/auth";
import { CARNETS, SEANCES, SUIVIS } from "@/lib/donnees-profils";

// Route one-shot : remplace le carnet, les séances et les mesures de suivi de
// TOUS les participants par le jeu de données figé (profils) généré hors-ligne
// via scripts/generate-dataset.ts. Ne touche pas aux participants eux-mêmes.
// À retirer après usage.

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return isSessionTokenValid(token);
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Conversion des dates (stockées en ISO string dans le fichier figé).
  const carnets = CARNETS.map((r) => ({ ...r, date: new Date(r.date) }));
  const seances = SEANCES.map((r) => ({ ...r, heureDebut: new Date(r.heureDebut as string) }));
  const suivis = SUIVIS.map((r) => ({ ...r }));

  const result = await prisma.$transaction([
    prisma.mesureSeance.deleteMany(),
    prisma.carnetJour.deleteMany(),
    prisma.mesureSuivi.deleteMany(),
    prisma.carnetJour.createMany({ data: carnets as never }),
    prisma.mesureSeance.createMany({ data: seances as never }),
    prisma.mesureSuivi.createMany({ data: suivis as never }),
  ]);

  return NextResponse.json({
    ok: true,
    carnets: result[3].count,
    seances: result[4].count,
    suivis: result[5].count,
  });
}
