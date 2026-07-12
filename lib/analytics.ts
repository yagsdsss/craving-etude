import type {
  CarnetJour,
  MesureSeance,
  MesureSuivi,
  Participant,
} from "@/app/generated/prisma/client";
import { cohensDIndependent, cohensDPaired, mean, round, stdDev } from "@/lib/stats";

type Data = {
  participants: Participant[];
  seances: MesureSeance[];
  carnets: CarnetJour[];
  suivis: MesureSuivi[];
};

function groupeOf(participants: Participant[], code: string) {
  return participants.find((p) => p.code === code)?.groupe ?? null;
}

export function avantApresGlobal(seances: MesureSeance[]) {
  const avant = seances.map((s) => s.cravingAvant).filter((v): v is number => v !== null);
  const apres = seances.map((s) => s.cravingApres).filter((v): v is number => v !== null);
  const paired = seances.filter((s) => s.cravingAvant !== null && s.cravingApres !== null);

  return {
    chart: [
      { label: "Avant", moyenne: round(mean(avant)) ?? 0 },
      { label: "Après", moyenne: round(mean(apres)) ?? 0 },
    ],
    moyenneAvant: round(mean(avant)),
    ecartTypeAvant: round(stdDev(avant)),
    moyenneApres: round(mean(apres)),
    ecartTypeApres: round(stdDev(apres)),
    n: paired.length,
    cohensD: round(
      cohensDPaired(
        paired.map((s) => s.cravingAvant!),
        paired.map((s) => s.cravingApres!)
      )
    ),
  };
}

export function deltaParModalite(seances: MesureSeance[]) {
  const parModalite = (modalite: "CARDIO" | "MUSCULATION") =>
    seances
      .filter((s) => s.modalite === modalite && s.deltaCraving !== null)
      .map((s) => s.deltaCraving as number);

  const cardio = parModalite("CARDIO");
  const muscu = parModalite("MUSCULATION");

  return {
    chart: [
      {
        label: "Cardio",
        moyenne: round(mean(cardio)) ?? 0,
        ecartType: round(stdDev(cardio)) ?? 0,
      },
      {
        label: "Musculation",
        moyenne: round(mean(muscu)) ?? 0,
        ecartType: round(stdDev(muscu)) ?? 0,
      },
    ],
    cohensD: round(cohensDIndependent(cardio, muscu)),
    nCardio: cardio.length,
    nMuscu: muscu.length,
  };
}

export function rpeParModalite(seances: MesureSeance[]) {
  const parModalite = (modalite: "CARDIO" | "MUSCULATION") =>
    seances
      .filter((s) => s.modalite === modalite && s.rpeReel !== null)
      .map((s) => s.rpeReel as number);

  const cardio = parModalite("CARDIO");
  const muscu = parModalite("MUSCULATION");

  return {
    chart: [
      { label: "Cardio", moyenne: round(mean(cardio)) ?? 0 },
      { label: "Musculation", moyenne: round(mean(muscu)) ?? 0 },
    ],
    ecartAbsolu: round(
      mean(cardio) !== null && mean(muscu) !== null ? Math.abs(mean(cardio)! - mean(muscu)!) : null
    ),
  };
}

export function cravingTraitParTemps(suivis: MesureSuivi[], participants: Participant[]) {
  const temps = ["T0", "T1", "T2"] as const;
  return temps.map((t) => {
    const rows = suivis.filter((s) => s.temps === t && s.scoreCravingTrait !== null);
    const exp = rows.filter((s) => groupeOf(participants, s.participantCode) === "EXPERIMENTAL");
    const ctrl = rows.filter((s) => groupeOf(participants, s.participantCode) === "CONTROLE");
    return {
      temps: t,
      experimental: round(mean(exp.map((s) => s.scoreCravingTrait as number))),
      controle: round(mean(ctrl.map((s) => s.scoreCravingTrait as number))),
    };
  });
}

function dayDiff(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function semaineDeCarnet(carnets: CarnetJour[]) {
  const startByParticipant = new Map<string, Date>();
  for (const c of carnets) {
    const current = startByParticipant.get(c.participantCode);
    if (!current || c.date < current) startByParticipant.set(c.participantCode, c.date);
  }
  return carnets.map((c) => {
    const start = startByParticipant.get(c.participantCode)!;
    const semaine = Math.min(6, Math.max(1, Math.floor(dayDiff(c.date, start) / 7) + 1));
    return { ...c, semaine };
  });
}

export function consommationParSemaine(carnets: CarnetJour[], participants: Participant[]) {
  const withWeek = semaineDeCarnet(carnets);

  const consoEquivalente = (c: CarnetJour) => {
    const values = [c.cigarettes, c.puffPrises, c.snusSachets].filter(
      (v): v is number => v !== null
    );
    return values.length ? values.reduce((a, b) => a + b, 0) : null;
  };

  return Array.from({ length: 6 }, (_, i) => i + 1).map((semaine) => {
    const rows = withWeek.filter((c) => c.semaine === semaine);
    const exp = rows.filter((c) => groupeOf(participants, c.participantCode) === "EXPERIMENTAL");
    const ctrl = rows.filter((c) => groupeOf(participants, c.participantCode) === "CONTROLE");
    const valuesExp = exp.map(consoEquivalente).filter((v): v is number => v !== null);
    const valuesCtrl = ctrl.map(consoEquivalente).filter((v): v is number => v !== null);
    return {
      semaine: `S${semaine}`,
      experimental: round(mean(valuesExp)),
      controle: round(mean(valuesCtrl)),
    };
  });
}

export function trajectoiresIndividuelles(carnets: CarnetJour[], participants: Participant[]) {
  const withWeek = semaineDeCarnet(carnets);
  const consoEquivalente = (c: CarnetJour) => {
    const values = [c.cigarettes, c.puffPrises, c.snusSachets].filter(
      (v): v is number => v !== null
    );
    return values.length ? values.reduce((a, b) => a + b, 0) : null;
  };

  const semaines = Array.from({ length: 6 }, (_, i) => i + 1);
  return semaines.map((semaine) => {
    const point: Record<string, number | string | null> = { semaine: `S${semaine}` };
    for (const p of participants) {
      const rows = withWeek.filter((c) => c.semaine === semaine && c.participantCode === p.code);
      const values = rows.map(consoEquivalente).filter((v): v is number => v !== null);
      point[p.code] = round(mean(values));
    }
    return point;
  });
}

const SEANCES_ATTENDUES_TOTAL = 12; // 2 séances/semaine × 6 semaines

/**
 * Calculé automatiquement à partir des séances effectivement enregistrées pour
 * chaque participant — pas de saisie manuelle. Seul le groupe expérimental a un
 * programme à suivre, le taux est donc `null` pour le groupe contrôle.
 */
export function tauxPresenceParParticipant(seances: MesureSeance[], participants: Participant[]) {
  return participants.map((p) => {
    if (p.groupe !== "EXPERIMENTAL") return { code: p.code, tauxPresence: null };
    const nbSeances = seances.filter((s) => s.participantCode === p.code).length;
    const tauxPresence = round((nbSeances / SEANCES_ATTENDUES_TOTAL) * 100);
    return { code: p.code, tauxPresence };
  });
}

export function donneesManquantes(data: Data) {
  const countNulls = (rows: Record<string, unknown>[], fields: string[]) =>
    fields.map((field) => ({
      champ: field,
      manquants: rows.filter((r) => r[field] === null || r[field] === undefined).length,
      total: rows.length,
    }));

  return {
    mesureSeance: countNulls(data.seances as unknown as Record<string, unknown>[], [
      "cravingAvant",
      "cravingApres",
      "rpeReel",
      "heuresDepuisDerniereConso",
    ]),
    carnetJour: countNulls(data.carnets as unknown as Record<string, unknown>[], [
      "cigarettes",
      "puffPrises",
      "snusSachets",
      "cravingMoyenJour",
    ]),
    mesureSuivi: countNulls(data.suivis as unknown as Record<string, unknown>[], [
      "scoreFagerstrom",
      "scoreCravingTrait",
      "consoMoyenneSemaine",
      "test6min",
      "poids",
      "imc",
      "tourTaille",
      "envieArreter",
      "capaciteReduireConso",
    ]),
  };
}
