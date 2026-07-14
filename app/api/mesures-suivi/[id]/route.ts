import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mesureSuiviUpdateSchema } from "@/lib/schemas";
import { computeQsuScores } from "@/lib/qsu";
import { isSessionTokenValid, SESSION_COOKIE } from "@/lib/auth";

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return isSessionTokenValid(token);
}

const QSU_KEYS = [
  "qsu1",
  "qsu2",
  "qsu3",
  "qsu4",
  "qsu5",
  "qsu6",
  "qsu7",
  "qsu8",
  "qsu9",
  "qsu10",
] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = mesureSuiviUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.mesureSuivi.findUnique({ where: { id: Number(id) } });
  if (!existing) {
    return NextResponse.json({ error: "Mesure introuvable" }, { status: 404 });
  }

  // Recalcul des scores QSU à partir des items finaux (existants + modifiés)
  const finalItems: Record<string, number | null> = {};
  for (const key of QSU_KEYS) {
    finalItems[key] = parsed.data[key] !== undefined ? parsed.data[key]! : existing[key];
  }
  const scores = computeQsuScores(finalItems);

  const mesure = await prisma.mesureSuivi.update({
    where: { id: Number(id) },
    data: { ...parsed.data, ...scores },
  });

  return NextResponse.json(mesure);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.mesureSuivi.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
