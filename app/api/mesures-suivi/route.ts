import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mesureSuiviSchema } from "@/lib/schemas";

export async function GET() {
  const mesures = await prisma.mesureSuivi.findMany({
    orderBy: [{ participantCode: "asc" }, { temps: "asc" }],
  });
  return NextResponse.json(mesures);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = mesureSuiviSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { participantCode, temps, ...rest } = parsed.data;

  const mesure = await prisma.mesureSuivi.upsert({
    where: { participantCode_temps: { participantCode, temps } },
    create: { participantCode, temps, ...rest },
    update: rest,
  });

  return NextResponse.json(mesure, { status: 201 });
}
