import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mesureSeanceSchema } from "@/lib/schemas";
import { computeQsuScores } from "@/lib/qsu";

export async function GET() {
  const mesures = await prisma.mesureSeance.findMany({
    orderBy: [{ participantCode: "asc" }, { semaine: "asc" }, { numeroSeance: "asc" }],
  });
  return NextResponse.json(mesures);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = mesureSeanceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const participant = await prisma.participant.findUnique({
    where: { code: parsed.data.participantCode },
  });
  if (!participant) {
    return NextResponse.json({ error: "Code participant inconnu" }, { status: 404 });
  }

  const { cravingAvant, cravingApres, heureDebut, ...rest } = parsed.data;
  const deltaCraving =
    cravingAvant != null && cravingApres != null ? cravingApres - cravingAvant : null;
  const qsuScores = computeQsuScores(rest);

  const data = {
    ...rest,
    ...qsuScores,
    cravingAvant,
    cravingApres,
    deltaCraving,
    heureDebut: heureDebut ? new Date(heureDebut) : null,
  };

  const mesure = await prisma.mesureSeance.upsert({
    where: {
      participantCode_semaine_numeroSeance: {
        participantCode: rest.participantCode,
        semaine: rest.semaine,
        numeroSeance: rest.numeroSeance,
      },
    },
    create: data,
    update: data,
  });

  return NextResponse.json(mesure, { status: 201 });
}
