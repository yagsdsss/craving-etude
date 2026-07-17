import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mesureSuiviUpdateSchema } from "@/lib/schemas";
import { computeFagerstromScore } from "@/lib/fagerstrom";
import { computeImc } from "@/lib/imc";
import { isSessionTokenValid, SESSION_COOKIE } from "@/lib/auth";

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return isSessionTokenValid(token);
}

const FAGER_KEYS = ["fager1", "fager2", "fager3", "fager4", "fager5", "fager6"] as const;

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

  // Recalcul du score Fagerström à partir des items finaux (existants + modifiés)
  const finalFager: Record<string, number | null> = {};
  for (const key of FAGER_KEYS) {
    finalFager[key] = parsed.data[key] !== undefined ? parsed.data[key]! : existing[key];
  }
  const scoreFagerstrom = computeFagerstromScore(finalFager);

  // Recalcul de l'IMC à partir du poids et de la taille finaux
  const poids = parsed.data.poids !== undefined ? parsed.data.poids : existing.poids;
  const taille = parsed.data.taille !== undefined ? parsed.data.taille : existing.taille;
  const imc = computeImc(poids, taille);

  const mesure = await prisma.mesureSuivi.update({
    where: { id: Number(id) },
    data: { ...parsed.data, scoreFagerstrom, imc },
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
