import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mesureSeanceSchema } from "@/lib/schemas";

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

  const { cravingAvant, cravingApres, heureDebut, ...rest } = parsed.data;
  const deltaCraving =
    cravingAvant != null && cravingApres != null ? cravingApres - cravingAvant : null;

  const mesure = await prisma.mesureSeance.upsert({
    where: {
      participantCode_semaine_numeroSeance: {
        participantCode: rest.participantCode,
        semaine: rest.semaine,
        numeroSeance: rest.numeroSeance,
      },
    },
    create: {
      ...rest,
      cravingAvant,
      cravingApres,
      deltaCraving,
      heureDebut: heureDebut ? new Date(heureDebut) : null,
    },
    update: {
      ...rest,
      cravingAvant,
      cravingApres,
      deltaCraving,
      heureDebut: heureDebut ? new Date(heureDebut) : null,
    },
  });

  return NextResponse.json(mesure, { status: 201 });
}
