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

// --- Conversion de la consommation en équivalent cigarette ------------------
// Équivalence fondée sur la nicotine (plus défendable qu'un décompte de bouffées).
// Puff Adalya 20K : 25 mL d'e-liquide à 20 mg/mL → 500 mg de nicotine pour 100 %
// du goût utilisé. Rapporté au contenu nicotinique d'une cigarette (~10 mg), on
// obtient 100 % ≈ 50 cigarettes, soit 1 % ≈ 0,5 cigarette.
// ⚠️ MG_NICOTINE_PAR_CIGARETTE est une hypothèse (fourchette usuelle 8-12 mg de
// contenu par cigarette) — à valider / citer dans le mémoire. Ajuste-la ici, tout
// le tableau de bord recalcule automatiquement.
const MG_NICOTINE_PUFF_100 = 25 * 20; // 500 mg de nicotine pour 100 % du goût
const MG_NICOTINE_PAR_CIGARETTE = 10; // contenu nicotinique moyen d'une cigarette
const CIGARETTES_PAR_POURCENT_PUFF =
  MG_NICOTINE_PUFF_100 / 100 / MG_NICOTINE_PAR_CIGARETTE; // = 0,5 cig par 1 %

/**
 * Consommation quotidienne convertie en équivalent cigarette :
 *   cigarettes (nombre) + puff (% → cig-équiv) + snus (1 sachet = 1 unité).
 * Renvoie null si aucun des champs n'est renseigné (donnée manquante ≠ 0).
 */
function consoEquivalente(c: CarnetJour): number | null {
  const parts: number[] = [];
  if (c.cigarettes !== null) parts.push(c.cigarettes);
  if (c.puffPourcentage !== null) parts.push(c.puffPourcentage * CIGARETTES_PAR_POURCENT_PUFF);
  if (c.snusSachets !== null) parts.push(c.snusSachets);
  return parts.length ? parts.reduce((a, b) => a + b, 0) : null;
}

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

/**
 * Effet de la séance semaine par semaine : envie moyenne avant/après et delta,
 * pour voir si la réduction d'envie évolue au fil des 6 semaines.
 */
export function effetSeanceParSemaine(seances: MesureSeance[]) {
  return Array.from({ length: 6 }, (_, i) => i + 1).map((semaine) => {
    const rows = seances.filter((s) => s.semaine === semaine);
    const avant = rows.map((s) => s.cravingAvant).filter((v): v is number => v !== null);
    const apres = rows.map((s) => s.cravingApres).filter((v): v is number => v !== null);
    const delta = rows.map((s) => s.deltaCraving).filter((v): v is number => v !== null);
    return {
      semaine: `S${semaine}`,
      avant: round(mean(avant)) ?? 0,
      apres: round(mean(apres)) ?? 0,
      delta: round(mean(delta)) ?? 0,
      n: delta.length,
    };
  });
}

/**
 * Récapitulatif hebdomadaire par participant : pour chaque semaine où le
 * participant a des données, envie moyenne (carnet), delta séance moyen et
 * consommation moyenne (équivalent cigarette). Base du suivi ligne par ligne.
 */
export function recapHebdoParParticipant(
  seances: MesureSeance[],
  carnets: CarnetJour[],
  participants: Participant[]
) {
  const carnetsWithWeek = semaineDeCarnet(carnets);
  const rows: {
    code: string;
    groupe: string;
    semaine: number;
    envieMoyenne: number | null;
    deltaSeance: number | null;
    consoMoyenne: number | null;
  }[] = [];

  for (const p of participants) {
    for (let semaine = 1; semaine <= 6; semaine++) {
      const cs = carnetsWithWeek.filter(
        (c) => c.participantCode === p.code && c.semaine === semaine
      );
      const ss = seances.filter((s) => s.participantCode === p.code && s.semaine === semaine);

      const envies = cs
        .map((c) => c.cravingMoyenJour)
        .filter((v): v is number => v !== null);
      const deltas = ss.map((s) => s.deltaCraving).filter((v): v is number => v !== null);
      const consos = cs.map(consoEquivalente).filter((v): v is number => v !== null);

      // n'afficher que les semaines avec au moins une donnée
      if (cs.length === 0 && ss.length === 0) continue;

      rows.push({
        code: p.code,
        groupe: p.groupe,
        semaine,
        envieMoyenne: round(mean(envies)),
        deltaSeance: round(mean(deltas)),
        consoMoyenne: round(mean(consos)),
      });
    }
  }

  return rows;
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
      "puffPourcentage",
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
