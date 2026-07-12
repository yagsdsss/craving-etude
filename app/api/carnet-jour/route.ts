import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { carnetJourSchema } from "@/lib/schemas";

export async function GET() {
  const carnets = await prisma.carnetJour.findMany({
    orderBy: [{ participantCode: "asc" }, { date: "asc" }],
  });
  return NextResponse.json(carnets);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = carnetJourSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const participant = await prisma.participant.findUnique({
    where: { code: parsed.data.participantCode },
  });
  if (!participant) {
    return NextResponse.json({ error: "Code participant inconnu" }, { status: 404 });
  }

  const { participantCode, date, ...rest } = parsed.data;
  const day = new Date(date);

  const carnet = await prisma.carnetJour.upsert({
    where: { participantCode_date: { participantCode, date: day } },
    create: { participantCode, date: day, ...rest },
    update: rest,
  });

  return NextResponse.json(carnet, { status: 201 });
}
