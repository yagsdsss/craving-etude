import { z } from "zod";

const scale0to10 = z.number().int().min(0).max(10);

export const participantSchema = z.object({
  code: z.string().regex(/^P(0[1-9]|1[0-9]|20)$/, "Code attendu : P01 à P20"),
  groupe: z.enum(["EXPERIMENTAL", "CONTROLE"]),
  age: z.number().int().min(18).max(30),
  sexe: z.enum(["HOMME", "FEMME", "AUTRE"]),
  sousGroupe: z.enum(["A", "B"]),
});

const qsuItem = z.number().int().min(1).max(7);
const fagerItem = z.number().int().min(0).max(3);

const qsuFields = {
  qsu1: qsuItem.nullable().optional(),
  qsu2: qsuItem.nullable().optional(),
  qsu3: qsuItem.nullable().optional(),
  qsu4: qsuItem.nullable().optional(),
  qsu5: qsuItem.nullable().optional(),
  qsu6: qsuItem.nullable().optional(),
  qsu7: qsuItem.nullable().optional(),
  qsu8: qsuItem.nullable().optional(),
  qsu9: qsuItem.nullable().optional(),
  qsu10: qsuItem.nullable().optional(),
};

const fagerFields = {
  fager1: fagerItem.nullable().optional(),
  fager2: fagerItem.nullable().optional(),
  fager3: fagerItem.nullable().optional(),
  fager4: fagerItem.nullable().optional(),
  fager5: fagerItem.nullable().optional(),
  fager6: fagerItem.nullable().optional(),
};

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
  ...qsuFields,
});

export const carnetJourSchema = z.object({
  participantCode: z.string(),
  date: z.string(), // YYYY-MM-DD
  cigarettes: z.number().int().min(0).nullable().optional(),
  puffPourcentage: z.number().int().min(0).max(100).nullable().optional(),
  snusSachets: z.number().int().min(0).nullable().optional(),
  cravingMoyenJour: scale0to10.nullable().optional(),
  evenementParticulier: z.string().nullable().optional(),
});

export const mesureSuiviSchema = z.object({
  participantCode: z.string(),
  temps: z.enum(["T0", "T1", "T2"]),
  consoPuffSemaine: z.number().min(0).nullable().optional(),
  consoSnusSemaine: z.number().min(0).nullable().optional(),
  consoCigaretteSemaine: z.number().min(0).nullable().optional(),
  poids: z.number().min(0).nullable().optional(),
  taille: z.number().min(0).nullable().optional(),
  envieArreter: scale0to10.nullable().optional(),
  capaciteReduireConso: scale0to10.nullable().optional(),
  ...fagerFields,
});

// --- Schémas de mise à jour (back-office) : tous les champs optionnels, dates souples ---
// Les dates sont acceptées telles quelles (ISO ou "YYYY-MM-DDTHH:mm" du champ datetime-local),
// converties côté serveur avec new Date().

export const participantUpdateSchema = z.object({
  groupe: z.enum(["EXPERIMENTAL", "CONTROLE"]).optional(),
  age: z.number().int().min(18).max(30).optional(),
  sexe: z.enum(["HOMME", "FEMME", "AUTRE"]).optional(),
  sousGroupe: z.enum(["A", "B"]).optional(),
});

export const mesureSeanceUpdateSchema = z.object({
  semaine: z.number().int().min(1).max(6).optional(),
  numeroSeance: z.number().int().min(1).max(12).optional(),
  modalite: z.enum(["CARDIO", "MUSCULATION"]).optional(),
  ordre: z.enum(["PREMIERE", "DEUXIEME"]).optional(),
  heureDebut: z.string().nullable().optional(),
  cravingAvant: scale0to10.nullable().optional(),
  cravingApres: scale0to10.nullable().optional(),
  rpeReel: scale0to10.nullable().optional(),
  heuresDepuisDerniereConso: z.number().min(0).nullable().optional(),
  remarque: z.string().nullable().optional(),
  ...qsuFields,
});

export const carnetJourUpdateSchema = z.object({
  date: z.string().optional(),
  cigarettes: z.number().int().min(0).nullable().optional(),
  puffPourcentage: z.number().int().min(0).max(100).nullable().optional(),
  snusSachets: z.number().int().min(0).nullable().optional(),
  cravingMoyenJour: scale0to10.nullable().optional(),
  evenementParticulier: z.string().nullable().optional(),
});

export const mesureSuiviUpdateSchema = z.object({
  temps: z.enum(["T0", "T1", "T2"]).optional(),
  consoPuffSemaine: z.number().min(0).nullable().optional(),
  consoSnusSemaine: z.number().min(0).nullable().optional(),
  consoCigaretteSemaine: z.number().min(0).nullable().optional(),
  poids: z.number().min(0).nullable().optional(),
  taille: z.number().min(0).nullable().optional(),
  envieArreter: scale0to10.nullable().optional(),
  capaciteReduireConso: scale0to10.nullable().optional(),
  ...fagerFields,
});
