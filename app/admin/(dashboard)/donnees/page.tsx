"use client";

import { useState } from "react";
import DataEditor, { FieldConfig } from "@/components/admin/DataEditor";

const SEXE_OPTIONS = [
  { value: "HOMME", label: "Homme" },
  { value: "FEMME", label: "Femme" },
  { value: "AUTRE", label: "Autre" },
];
const GROUPE_OPTIONS = [
  { value: "EXPERIMENTAL", label: "Expérimental" },
  { value: "CONTROLE", label: "Contrôle" },
];
const SOUS_GROUPE_OPTIONS = [
  { value: "A", label: "A" },
  { value: "B", label: "B" },
];
const MODALITE_OPTIONS = [
  { value: "CARDIO", label: "Cardio" },
  { value: "MUSCULATION", label: "Musculation" },
];
const ORDRE_OPTIONS = [
  { value: "PREMIERE", label: "1ère séance" },
  { value: "DEUXIEME", label: "2e séance" },
];
const TEMPS_OPTIONS = [
  { value: "T0", label: "T0" },
  { value: "T1", label: "T1" },
  { value: "T2", label: "T2" },
];

const participantFields: FieldConfig[] = [
  { key: "code", label: "Code", type: "text", readOnly: true },
  { key: "groupe", label: "Groupe", type: "select", options: GROUPE_OPTIONS },
  { key: "sousGroupe", label: "Sous-groupe", type: "select", options: SOUS_GROUPE_OPTIONS },
  { key: "age", label: "Âge", type: "number", min: 18, max: 30 },
  { key: "sexe", label: "Sexe", type: "select", options: SEXE_OPTIONS },
];

const seanceFields: FieldConfig[] = [
  { key: "participantCode", label: "Participant", type: "text", readOnly: true },
  { key: "semaine", label: "Semaine", type: "number", min: 1, max: 6 },
  { key: "numeroSeance", label: "N° séance", type: "number", min: 1, max: 12 },
  { key: "modalite", label: "Modalité", type: "select", options: MODALITE_OPTIONS },
  { key: "ordre", label: "Position", type: "select", options: ORDRE_OPTIONS },
  { key: "heureDebut", label: "Date et heure de la séance", type: "datetime" },
  { key: "cravingAvant", label: "Envie avant (0-10)", type: "number", min: 0, max: 10 },
  { key: "cravingApres", label: "Envie après (0-10)", type: "number", min: 0, max: 10 },
  { key: "deltaCraving", label: "Delta", type: "number", readOnly: true },
  { key: "rpeReel", label: "RPE (0-10)", type: "number", min: 0, max: 10 },
  { key: "heuresDepuisDerniereConso", label: "Heures depuis conso", type: "number", min: 0 },
  { key: "remarque", label: "Remarque", type: "textarea" },
];

const carnetFields: FieldConfig[] = [
  { key: "participantCode", label: "Participant", type: "text", readOnly: true },
  { key: "date", label: "Date", type: "date" },
  { key: "cigarettes", label: "Cigarettes", type: "number", min: 0 },
  { key: "puffPrises", label: "Puffs", type: "number", min: 0 },
  { key: "snusSachets", label: "Snus", type: "number", min: 0 },
  { key: "cravingMoyenJour", label: "Envie moyenne (0-10)", type: "number", min: 0, max: 10 },
  { key: "evenementParticulier", label: "Événement particulier", type: "textarea" },
];

const qsuFields: FieldConfig[] = Array.from({ length: 10 }, (_, i) => ({
  key: `qsu${i + 1}`,
  label: `QSU ${i + 1} (1-7)`,
  type: "number" as const,
  min: 1,
  max: 7,
}));

const suiviFields: FieldConfig[] = [
  { key: "participantCode", label: "Participant", type: "text", readOnly: true },
  { key: "temps", label: "Temps", type: "select", options: TEMPS_OPTIONS },
  { key: "scoreFagerstrom", label: "Fagerström (0-10)", type: "number", min: 0, max: 10 },
  { key: "consoMoyenneSemaine", label: "Conso moy./semaine", type: "number", min: 0 },
  { key: "test6min", label: "Test 6 min (m)", type: "number", min: 0 },
  { key: "poids", label: "Poids (kg)", type: "number", min: 0 },
  { key: "imc", label: "IMC", type: "number", min: 0 },
  { key: "tourTaille", label: "Tour de taille (cm)", type: "number", min: 0 },
  { key: "envieArreter", label: "Envie d'arrêter (0-10)", type: "number", min: 0, max: 10 },
  { key: "capaciteReduireConso", label: "Capacité à réduire (0-10)", type: "number", min: 0, max: 10 },
  ...qsuFields,
  { key: "scoreCravingTrait", label: "Score QSU total", type: "number", readOnly: true },
  { key: "qsuFacteur1", label: "QSU facteur 1", type: "number", readOnly: true },
  { key: "qsuFacteur2", label: "QSU facteur 2", type: "number", readOnly: true },
];

const TABS = [
  {
    id: "participants",
    label: "Participants",
    editor: (
      <DataEditor
        listEndpoint="/api/participants"
        itemEndpoint={(r) => `/api/participants/${r.code}`}
        idField="code"
        fields={participantFields}
        summaryFields={["code", "groupe", "sousGroupe", "age", "sexe"]}
      />
    ),
  },
  {
    id: "seances",
    label: "Séances",
    editor: (
      <DataEditor
        listEndpoint="/api/mesures-seance"
        itemEndpoint={(r) => `/api/mesures-seance/${r.id}`}
        idField="id"
        fields={seanceFields}
        summaryFields={[
          "participantCode",
          "semaine",
          "modalite",
          "heureDebut",
          "cravingAvant",
          "cravingApres",
          "deltaCraving",
        ]}
      />
    ),
  },
  {
    id: "carnet",
    label: "Carnet",
    editor: (
      <DataEditor
        listEndpoint="/api/carnet-jour"
        itemEndpoint={(r) => `/api/carnet-jour/${r.id}`}
        idField="id"
        fields={carnetFields}
        summaryFields={[
          "participantCode",
          "date",
          "cigarettes",
          "puffPrises",
          "snusSachets",
          "cravingMoyenJour",
        ]}
      />
    ),
  },
  {
    id: "suivi",
    label: "Suivi T0/T1/T2",
    editor: (
      <DataEditor
        listEndpoint="/api/mesures-suivi"
        itemEndpoint={(r) => `/api/mesures-suivi/${r.id}`}
        idField="id"
        fields={suiviFields}
        summaryFields={[
          "participantCode",
          "temps",
          "scoreCravingTrait",
          "scoreFagerstrom",
          "poids",
        ]}
      />
    ),
  },
];

export default function DonneesPage() {
  const [active, setActive] = useState("participants");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Données</h1>
        <p className="mt-1 text-sm text-slate-500">
          Consulte et corrige toutes les données saisies, y compris les dates.
        </p>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition ${
              active === tab.id
                ? "border-b-2 border-slate-900 text-slate-900"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {TABS.map((tab) => (
        <div key={tab.id} className={active === tab.id ? "" : "hidden"}>
          {tab.editor}
        </div>
      ))}
    </div>
  );
}
