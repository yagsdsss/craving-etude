import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { participantUpdateSchema } from "@/lib/schemas";
import { isSessionTokenValid, SESSION_COOKIE } from "@/lib/auth";

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return isSessionTokenValid(token);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { code } = await params;
  const body = await request.json();
  const parsed = participantUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existant = await prisma.participant.findUnique({ where: { code } });
  if (!existant) {
    return NextResponse.json({ error: "Participant introuvable" }, { status: 404 });
  }

  // Le sous-groupe (ordre des modalités) ne concerne que le groupe expérimental.
  // On le recalcule à partir du groupe résultant, car la mise à jour peut être
  // partielle ou changer le groupe.
  const groupe = parsed.data.groupe ?? existant.groupe;
  const sousGroupeVoulu =
    parsed.data.sousGroupe !== undefined ? parsed.data.sousGroupe : existant.sousGroupe;

  if (groupe === "EXPERIMENTAL" && sousGroupeVoulu == null) {
    return NextResponse.json(
      { error: "Le sous-groupe est requis pour le groupe expérimental" },
      { status: 400 }
    );
  }

  const participant = await prisma.participant.update({
    where: { code },
    data: {
      ...parsed.data,
      sousGroupe: groupe === "EXPERIMENTAL" ? sousGroupeVoulu : null,
    },
  });
  return NextResponse.json(participant);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { code } = await params;
  await prisma.participant.delete({ where: { code } });
  return NextResponse.json({ ok: true });
}
