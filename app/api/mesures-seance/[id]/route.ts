import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mesureSeanceUpdateSchema } from "@/lib/schemas";
import { isSessionTokenValid, SESSION_COOKIE } from "@/lib/auth";

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return isSessionTokenValid(token);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = mesureSeanceUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.mesureSeance.findUnique({ where: { id: Number(id) } });
  if (!existing) {
    return NextResponse.json({ error: "Séance introuvable" }, { status: 404 });
  }

  const { heureDebut, ...rest } = parsed.data;

  // Recalcul du delta à partir des valeurs finales (existantes + modifiées)
  const cravingAvant = rest.cravingAvant !== undefined ? rest.cravingAvant : existing.cravingAvant;
  const cravingApres = rest.cravingApres !== undefined ? rest.cravingApres : existing.cravingApres;
  const deltaCraving =
    cravingAvant != null && cravingApres != null ? cravingApres - cravingAvant : null;

  const mesure = await prisma.mesureSeance.update({
    where: { id: Number(id) },
    data: {
      ...rest,
      deltaCraving,
      ...(heureDebut !== undefined
        ? { heureDebut: heureDebut ? new Date(heureDebut) : null }
        : {}),
    },
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
  await prisma.mesureSeance.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
