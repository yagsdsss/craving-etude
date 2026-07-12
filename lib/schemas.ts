import { z } from "zod";

const scale0to10 = z.number().int().min(0).max(10);

export const participantSchema = z.object({
  code: z.string().regex(/^P(0[1-9]|1[0-5])$/, "Code attendu : P01 à P15"),
  groupe: z.enum(["EXPERIMENTAL", "CONTROLE"]),
  age: z.number().int().min(18).max(30),
  sexe: z.enum(["HOMME", "FEMME", "AUTRE"]),
  sousGroupe: z.enum(["A", "B"]),
});

export const mesureSeanceSchema = z.object({
  participantCode: z.string(),
  semaine: z.number().int().min(1).max(6),
  numeroSeance: z.number().int().min(1).max(12),
  modalite: z.enum(["CARDIO", "MUSCULATION"]),
  ordre: z.enum(["PREMIERE", "DEUXIEME"]),
  heureDebut: z.string().datetime().nullable().optional(),
  cravingAvant: scale0to10.nullable().optional(),
  cravingApres: scale0to10.nullable().optional(),
  rpeReel: scale0to10.nullable().optional(),
  heuresDepuisDerniereConso: z.number().min(0).nullable().optional(),
  remarque: z.string().nullable().optional(),
});

export const carnetJourSchema = z.object({
  participantCode: z.string(),
  date: z.string(), // YYYY-MM-DD
  cigarettes: z.number().int().min(0).nullable().optional(),
  puffPrises: z.number().int().min(0).nullable().optional(),
  snusSachets: z.number().int().min(0).nullable().optional(),
  cravingMoyenJour: scale0to10.nullable().optional(),
  evenementParticulier: z.string().nullable().optional(),
});

export const mesureSuiviSchema = z.object({
  participantCode: z.string(),
  temps: z.enum(["T0", "T1", "T2"]),
  scoreFagerstrom: z.number().int().min(0).max(10).nullable().optional(),
  scoreCravingTrait: z.number().nullable().optional(),
  consoMoyenneSemaine: z.number().min(0).nullable().optional(),
  test6min: z.number().min(0).nullable().optional(),
  poids: z.number().min(0).nullable().optional(),
  imc: z.number().min(0).nullable().optional(),
  tourTaille: z.number().min(0).nullable().optional(),
  tauxPresence: z.number().min(0).max(100).nullable().optional(),
});
