import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSessionTokenValid, SESSION_COOKIE } from "@/lib/auth";

const TABLES = {
  participants: () => prisma.participant.findMany({ orderBy: { code: "asc" } }),
  "mesures-seance": () =>
    prisma.mesureSeance.findMany({
      orderBy: [{ participantCode: "asc" }, { semaine: "asc" }, { numeroSeance: "asc" }],
    }),
  "carnet-jour": () =>
    prisma.carnetJour.findMany({ orderBy: [{ participantCode: "asc" }, { date: "asc" }] }),
  "mesures-suivi": () =>
    prisma.mesureSuivi.findMany({ orderBy: [{ participantCode: "asc" }, { temps: "asc" }] }),
} as const;

type TableName = keyof typeof TABLES;

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    if (value === null || value === undefined) return "";
    const str = value instanceof Date ? value.toISOString() : String(value);
    return `"${str.replace(/"/g, '""')}"`;
  };
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ];
  return lines.join("\n");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!(await isSessionTokenValid(token))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { table } = await params;
  if (!(table in TABLES)) {
    return NextResponse.json({ error: "Table inconnue" }, { status: 404 });
  }

  const rows = await TABLES[table as TableName]();
  const csv = toCsv(rows as unknown as Record<string, unknown>[]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${table}.csv"`,
    },
  });
}
