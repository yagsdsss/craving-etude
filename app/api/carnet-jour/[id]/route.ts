import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { carnetJourUpdateSchema } from "@/lib/schemas";
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
  const parsed = carnetJourUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { date, ...rest } = parsed.data;

  const carnet = await prisma.carnetJour.update({
    where: { id: Number(id) },
    data: {
      ...rest,
      ...(date !== undefined ? { date: new Date(date) } : {}),
    },
  });

  return NextResponse.json(carnet);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.carnetJour.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
