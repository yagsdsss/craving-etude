import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { participantSchema } from "@/lib/schemas";

export async function GET() {
  const participants = await prisma.participant.findMany({
    orderBy: { code: "asc" },
  });
  return NextResponse.json(participants);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = participantSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const participant = await prisma.participant.create({ data: parsed.data });
  return NextResponse.json(participant, { status: 201 });
}
