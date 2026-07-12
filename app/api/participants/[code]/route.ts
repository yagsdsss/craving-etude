import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  await prisma.participant.delete({ where: { code } });
  return NextResponse.json({ ok: true });
}
