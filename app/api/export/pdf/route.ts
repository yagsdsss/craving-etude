import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSessionTokenValid, SESSION_COOKIE } from "@/lib/auth";
import { generateRawDataPdf } from "@/lib/pdfExport";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!(await isSessionTokenValid(token))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const [participants, seances, carnets, suivis] = await Promise.all([
    prisma.participant.findMany({ orderBy: { code: "asc" } }),
    prisma.mesureSeance.findMany({
      orderBy: [{ participantCode: "asc" }, { semaine: "asc" }, { numeroSeance: "asc" }],
    }),
    prisma.carnetJour.findMany({ orderBy: [{ participantCode: "asc" }, { date: "asc" }] }),
    prisma.mesureSuivi.findMany({ orderBy: [{ participantCode: "asc" }, { temps: "asc" }] }),
  ]);

  const pdf = await generateRawDataPdf({
    participants: participants as unknown as Record<string, unknown>[],
    seances: seances as unknown as Record<string, unknown>[],
    carnets: carnets as unknown as Record<string, unknown>[],
    suivis: suivis as unknown as Record<string, unknown>[],
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="donnees-brutes.pdf"',
    },
  });
}
