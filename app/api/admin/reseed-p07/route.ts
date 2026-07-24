import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSessionTokenValid, SESSION_COOKIE } from "@/lib/auth";

// Route one-shot : régénère UNIQUEMENT le carnet quotidien de P07 avec un
// profil réaliste (jours oubliés, envie qui stagne autour de 7/10 sans baisser).
// Ne touche à aucun autre participant ni aux séances/mesures de suivi.
// À retirer après usage.

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return isSessionTokenValid(token);
}

// RNG à seed fixe pour un résultat reproductible.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const participant = await prisma.participant.findUnique({ where: { code: "P07" } });
  if (!participant) {
    return NextResponse.json({ error: "P07 introuvable" }, { status: 404 });
  }

  const rng = mulberry32(707);
  const randFloat = (min: number, max: number, decimals = 1) => {
    const value = rng() * (max - min) + min;
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  };
  const chance = (p: number) => rng() < p;
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];

  const studyStart = new Date("2026-01-05T00:00:00.000Z");

  const rows: {
    participantCode: string;
    date: Date;
    cigarettes: number | null;
    puffPourcentage: number | null;
    snusSachets: number | null;
    cravingMoyenJour: number | null;
    evenementParticulier: string | null;
  }[] = [];

  for (let semaine = 1; semaine <= 6; semaine++) {
    for (let jour = 0; jour < 7; jour++) {
      // P07 oublie ~20% des jours.
      if (chance(0.2)) continue;

      const date = new Date(studyStart);
      date.setUTCDate(date.getUTCDate() + (semaine - 1) * 7 + jour);

      // Consommation chaotique : stagne/remonte, pas de déclin régulier.
      let baseConso: number;
      if (semaine <= 2) baseConso = 18;
      else if (semaine <= 3) baseConso = 20;
      else if (semaine === 4) baseConso = 19;
      else baseConso = 20;
      const consoJour = clamp(baseConso + randFloat(-5, 5), 0, 40);

      const cigarettes = chance(0.08) ? null : Math.round(consoJour * 0.7);
      const puffPourcentage = chance(0.08)
        ? null
        : Math.round(clamp(6 + randFloat(-2, 2), 0, 100));
      const snusSachets = chance(0.5) ? (chance(0.08) ? null : Math.round(consoJour * 0.05)) : 0;

      // Envie augmente après le sport mais stagne globalement (~7/10, ne baisse pas).
      let cravingBase: number;
      if (semaine <= 2) cravingBase = 7;
      else if (semaine <= 4) cravingBase = 7.5;
      else cravingBase = 7.2;
      const cravingMoyenJour = chance(0.06)
        ? null
        : Math.round(clamp(cravingBase + randFloat(-1, 1.5), 0, 10));

      rows.push({
        participantCode: "P07",
        date,
        cigarettes,
        puffPourcentage,
        snusSachets,
        cravingMoyenJour,
        evenementParticulier: chance(0.15)
          ? pick([
              "Envie plus forte après le sport.",
              "Journée stressante, envie augmente.",
              "Séance cardio, beaucoup d'envie après.",
              "Muscu + envie forte, c'est lié?",
            ])
          : null,
      });
    }
  }

  // Remplacement atomique : on efface le carnet de P07 puis on recrée.
  const [{ count: deleted }] = await prisma.$transaction([
    prisma.carnetJour.deleteMany({ where: { participantCode: "P07" } }),
    prisma.carnetJour.createMany({ data: rows }),
  ]);

  return NextResponse.json({
    ok: true,
    participant: "P07",
    supprimes: deleted,
    crees: rows.length,
    joursRenseignes: rows.filter((r) => r.cravingMoyenJour !== null).length,
  });
}
