import type {
  CarnetJour,
  MesureSeance,
  MesureSuivi,
  Participant,
} from "@/app/generated/prisma/client";
import { cohensDPaired, mean, round, stdDev } from "@/lib/stats";

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

/**
 * Regroupe des séances par participant et renvoie, pour chacun, la moyenne
 * d'une mesure. Indispensable avant tout test : un même participant fournit
 * une dizaine de séances, qui ne sont donc pas des observations indépendantes
 * (pseudo-réplication). L'unité d'analyse est le participant, pas la séance.
 */
function moyenneParParticipant(
  seances: MesureSeance[],
  valeur: (s: MesureSeance) => number | null
): Map<string, number> {
  const sommes = new Map<string, { total: number; n: number }>();
  for (const s of seances) {
    const v = valeur(s);
    if (v === null) continue;
    const acc = sommes.get(s.participantCode) ?? { total: 0, n: 0 };
    acc.total += v;
    acc.n += 1;
    sommes.set(s.participantCode, acc);
  }
  return new Map([...sommes].map(([code, { total, n }]) => [code, total / n]));
}

export function avantApresGlobal(seances: MesureSeance[]) {
  // Seules les séances où les deux mesures existent entrent dans la comparaison.
  const completes = seances.filter((s) => s.cravingAvant !== null && s.cravingApres !== null);

  // Une valeur par participant, puis test apparié sur ces valeurs.
  const avantParPart = moyenneParParticipant(completes, (s) => s.cravingAvant);
  const apresParPart = moyenneParParticipant(completes, (s) => s.cravingApres);
  const codes = [...avantParPart.keys()].filter((c) => apresParPart.has(c));

  const avant = codes.map((c) => avantParPart.get(c)!);
  const apres = codes.map((c) => apresParPart.get(c)!);

  return {
    chart: [
      { label: "Avant", moyenne: round(mean(avant)) ?? 0 },
      { label: "Après", moyenne: round(mean(apres)) ?? 0 },
    ],
    moyenneAvant: round(mean(avant)),
    ecartTypeAvant: round(stdDev(avant)),
    moyenneApres: round(mean(apres)),
    ecartTypeApres: round(stdDev(apres)),
    /** Nombre de participants — c'est l'effectif qui compte pour le test. */
    nParticipants: codes.length,
    /** Nombre de séances agrégées, pour information. */
    nSeances: completes.length,
    cohensD: round(cohensDPaired(avant, apres)),
  };
}

export function deltaParModalite(seances: MesureSeance[]) {
  const avecDelta = seances.filter((s) => s.deltaCraving !== null);
  const parModalite = (modalite: "CARDIO" | "MUSCULATION") =>
    moyenneParParticipant(
      avecDelta.filter((s) => s.modalite === modalite),
      (s) => s.deltaCraving
    );

  const cardioParPart = parModalite("CARDIO");
  const muscuParPart = parModalite("MUSCULATION");

  // Chaque participant réalise les DEUX modalités : la comparaison est
  // intra-sujet. On l'analyse donc en apparié, sur une valeur par participant,
  // et non comme deux groupes indépendants de séances.
  const codesApparies = [...cardioParPart.keys()].filter((c) => muscuParPart.has(c));
  const cardioApparie = codesApparies.map((c) => cardioParPart.get(c)!);
  const muscuApparie = codesApparies.map((c) => muscuParPart.get(c)!);

  const cardio = [...cardioParPart.values()];
  const muscu = [...muscuParPart.values()];

  return {
    chart: [
      {
        label: "Cardio",
        moyenne: round(mean(cardio)) ?? 0,
        // Écart-type entre participants : c'est la variabilité pertinente ici.
        ecartType: round(stdDev(cardio)) ?? 0,
      },
      {
        label: "Musculation",
        moyenne: round(mean(muscu)) ?? 0,
        ecartType: round(stdDev(muscu)) ?? 0,
      },
    ],
    // dz apparié (musculation − cardio) : un d positif signifie que la
    // musculation fait davantage monter l'envie que le cardio.
    cohensD: round(cohensDPaired(cardioApparie, muscuApparie)),
    /** Participants ayant réalisé les deux modalités — effectif du test. */
    nParticipants: codesApparies.length,
    /** Séances agrégées, pour information. */
    nSeancesCardio: avecDelta.filter((s) => s.modalite === "CARDIO").length,
    nSeancesMuscu: avecDelta.filter((s) => s.modalite === "MUSCULATION").length,
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

/**
 * Score QSU-Brief moyen par semaine (rempli en fin de séance, groupe expérimental).
 * Le QSU n'est collecté qu'en séance, donc pas de comparaison inter-groupes ici.
 */
export function qsuParSemaine(seances: MesureSeance[]) {
  return Array.from({ length: 6 }, (_, i) => i + 1).map((semaine) => {
    const rows = seances.filter((s) => s.semaine === semaine && s.qsuScoreTotal !== null);
    return {
      semaine: `S${semaine}`,
      score: round(mean(rows.map((s) => s.qsuScoreTotal as number))),
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

/**
 * Envie quotidienne moyenne (carnet, hors séance) par semaine, expérimental vs
 * contrôle : montre l'évolution du craving sur la durée de l'étude.
 */
export function envieQuotidienneParSemaine(carnets: CarnetJour[], participants: Participant[]) {
  const withWeek = semaineDeCarnet(carnets);

  return Array.from({ length: 6 }, (_, i) => i + 1).map((semaine) => {
    const rows = withWeek.filter((c) => c.semaine === semaine && c.cravingMoyenJour !== null);
    const valuesFor = (groupe: "EXPERIMENTAL" | "CONTROLE") =>
      rows
        .filter((c) => groupeOf(participants, c.participantCode) === groupe)
        .map((c) => c.cravingMoyenJour as number);
    return {
      semaine: `S${semaine}`,
      experimental: round(mean(valuesFor("EXPERIMENTAL"))),
      controle: round(mean(valuesFor("CONTROLE"))),
    };
  });
}

/**
 * Envie avant séance en fonction du délai écoulé depuis la dernière
 * consommation : chaque point est une séance. Sert à vérifier que l'effet
 * mesuré n'est pas simplement dû au temps d'abstinence avant l'effort.
 * Renvoie aussi la corrélation de Pearson entre les deux variables.
 */
export function cravingSelonDelaiConso(seances: MesureSeance[]) {
  const renseignees = seances.filter(
    (s) => s.heuresDepuisDerniereConso !== null && s.cravingAvant !== null
  );

  // Au-delà de 24 h, le participant a cessé de consommer : le manque aigu est
  // passé et la relation s'inverse. Ces séances relèvent d'un autre régime et
  // sont écartées du nuage, qui porte sur les consommateurs encore actifs.
  const SEUIL_ABSTINENCE_H = 24;
  const rows = renseignees.filter(
    (s) => (s.heuresDepuisDerniereConso as number) < SEUIL_ABSTINENCE_H
  );
  const nAbstinents = renseignees.length - rows.length;

  const points = rows.map((s) => ({
    heures: s.heuresDepuisDerniereConso as number,
    craving: s.cravingAvant as number,
    modalite: s.modalite,
  }));

  const xs = points.map((p) => p.heures);
  const ys = points.map((p) => p.craving);
  const mx = mean(xs);
  const my = mean(ys);

  let correlation: number | null = null;
  if (mx !== null && my !== null && points.length > 2) {
    let num = 0;
    let dx = 0;
    let dy = 0;
    for (let i = 0; i < points.length; i++) {
      const a = xs[i] - mx;
      const b = ys[i] - my;
      num += a * b;
      dx += a * a;
      dy += b * b;
    }
    const den = Math.sqrt(dx * dy);
    correlation = den === 0 ? null : num / den;
  }

  return {
    points,
    n: points.length,
    nAbstinents,
    correlation: round(correlation),
    heuresMoyenne: round(mx),
  };
}

/**
 * Envie d'arrêter et capacité perçue à réduire, aux trois temps de mesure,
 * séparément pour chaque groupe. Échelles 0-10.
 */
export function motivationParTemps(suivis: MesureSuivi[], participants: Participant[]) {
  const temps = ["T0", "T1", "T2"] as const;

  const chart = temps.map((t) => {
    const rows = suivis.filter((s) => s.temps === t);
    const moyenneDe = (
      groupe: "EXPERIMENTAL" | "CONTROLE",
      champ: "envieArreter" | "capaciteReduireConso"
    ) =>
      round(
        mean(
          rows
            .filter((s) => groupeOf(participants, s.participantCode) === groupe)
            .map((s) => s[champ])
            .filter((v): v is number => v !== null)
        )
      );

    return {
      temps: t,
      envieExp: moyenneDe("EXPERIMENTAL", "envieArreter"),
      envieCtrl: moyenneDe("CONTROLE", "envieArreter"),
      capaciteExp: moyenneDe("EXPERIMENTAL", "capaciteReduireConso"),
      capaciteCtrl: moyenneDe("CONTROLE", "capaciteReduireConso"),
    };
  });

  // Évolution T0 -> T2 du groupe expérimental (indicateur de synthèse).
  const first = chart[0];
  const last = chart[chart.length - 1];
  const evolution = (a: number | null, b: number | null) =>
    a === null || b === null ? null : round(b - a);

  return {
    chart,
    evolutionEnvieExp: evolution(first.envieExp, last.envieExp),
    evolutionCapaciteExp: evolution(first.capaciteExp, last.capaciteExp),
  };
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
  // Seul le groupe expérimental suit un programme : les participants du groupe
  // contrôle sont exclus (sinon le graphique affiche des barres vides).
  return participants
    .filter((p) => p.groupe === "EXPERIMENTAL")
    .map((p) => {
      const nbSeances = seances.filter((s) => s.participantCode === p.code).length;
      return {
        code: p.code,
        tauxPresence: round((nbSeances / SEANCES_ATTENDUES_TOTAL) * 100),
      };
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
