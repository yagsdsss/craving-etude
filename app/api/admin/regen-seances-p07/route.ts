import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSessionTokenValid, SESSION_COOKIE } from "@/lib/auth";
import { computeQsuScores, QSU_ITEMS } from "@/lib/qsu";

// Route one-shot : régénère UNIQUEMENT les séances de P07, datées du
// 1er juillet au 10 août 2026, avec un profil réaliste — l'envie de nicotine
// remonte ou stagne APRÈS le sport (au lieu de bien baisser), sans amélioration
// nette sur les 6 semaines. Ne touche à aucun autre participant.
// À retirer après usage.

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return isSessionTokenValid(token);
}

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

  const rng = mulberry32(714);
  const randInt = (min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;
  const randFloat = (min: number, max: number, decimals = 1) => {
    const value = rng() * (max - min) + min;
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  };
  const chance = (p: number) => rng() < p;
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];

  // P07 : sous-groupe A → CARDIO en première séance, MUSCULATION en deuxième.
  const premiereModalite = participant.sousGroupe === "A" ? "CARDIO" : "MUSCULATION";
  const deuxiemeModalite = participant.sousGroupe === "A" ? "MUSCULATION" : "CARDIO";

  const studyStart = new Date("2026-07-01T00:00:00.000Z");

  const rows: Record<string, unknown>[] = [];

  for (let semaine = 1; semaine <= 6; semaine++) {
    for (const [numeroDansSemaine, ordre] of [
      [1, "PREMIERE"],
      [2, "DEUXIEME"],
    ] as const) {
      const numeroSeance = (semaine - 1) * 2 + numeroDansSemaine;
      const modalite = ordre === "PREMIERE" ? premiereModalite : deuxiemeModalite;

      // Envie AVANT : reste élevée et stable sur les 6 semaines (stagne).
      const cravingAvant = Math.round(clamp(6.5 + randFloat(-1, 1), 1, 10));

      // Envie APRÈS le sport : delta majoritairement positif ou nul (l'envie
      // remonte/stagne après la séance), parfois légèrement négatif.
      const postDelta = randFloat(-1, 2.5);
      const cravingApres = Math.round(clamp(cravingAvant + postDelta, 0, 10));

      const rpeReel = Math.round(
        clamp(6.5 + (modalite === "MUSCULATION" ? 0.2 : 0) + randFloat(-1, 1.2), 0, 10)
      );

      const heureDebut = new Date(studyStart);
      heureDebut.setUTCDate(
        heureDebut.getUTCDate() + (semaine - 1) * 7 + (numeroDansSemaine - 1) * 3
      );
      heureDebut.setUTCHours(randInt(9, 19), chance(0.5) ? 0 : 30);

      // QSU-Brief (fin de séance) : reste élevé (~5/7), ne décline pas.
      const qsuAnswers = Object.fromEntries(
        QSU_ITEMS.map((item) => [item.key, Math.round(clamp(5 + randFloat(-1, 1), 1, 7))])
      );
      const qsuScores = computeQsuScores(qsuAnswers);

      rows.push({
        participantCode: "P07",
        semaine,
        numeroSeance,
        modalite,
        ordre,
        heureDebut,
        cravingAvant,
        cravingApres,
        deltaCraving: cravingApres - cravingAvant,
        rpeReel,
        heuresDepuisDerniereConso: randFloat(0.5, 6, 1),
        remarque: chance(0.3)
          ? pick([
              "Encore plus envie de fumer après la séance.",
              "Le sport ne coupe pas l'envie chez moi.",
              "Envie forte juste après, comme d'habitude.",
              "Séance ok mais l'envie est revenue vite.",
            ])
          : null,
        ...qsuAnswers,
        ...qsuScores,
      });
    }
  }

  const [{ count: deleted }] = await prisma.$transaction([
    prisma.mesureSeance.deleteMany({ where: { participantCode: "P07" } }),
    prisma.mesureSeance.createMany({ data: rows as never }),
  ]);

  return NextResponse.json({
    ok: true,
    participant: "P07",
    supprimees: deleted,
    creees: rows.length,
    periode: "2026-07-01 → 2026-08-08",
  });
}
