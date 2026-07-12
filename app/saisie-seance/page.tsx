"use client";

import { useEffect, useState } from "react";
import ScaleButtons from "@/components/ScaleButtons";
import { flushQueue, pendingCount, submitWithOfflineFallback } from "@/lib/offlineSync";

const DRAFT_KEY = "seance-draft-v1";
const QUEUE_KEY = "seance-queue-v1";

type Step = "setup" | "avant" | "enCours" | "apres" | "rpe" | "confirmation";

type Draft = {
  step: Step;
  participantCode: string | null;
  modalite: "CARDIO" | "MUSCULATION" | null;
  semaine: number;
  numeroSeance: number;
  ordre: "PREMIERE" | "DEUXIEME" | null;
  heuresDepuisDerniereConso: string;
  heureDebut: string | null;
  cravingAvant: number | null;
  cravingApres: number | null;
  rpeReel: number | null;
  remarque: string;
};

const emptyDraft: Draft = {
  step: "setup",
  participantCode: null,
  modalite: null,
  semaine: 1,
  numeroSeance: 1,
  ordre: null,
  heuresDepuisDerniereConso: "",
  heureDebut: null,
  cravingAvant: null,
  cravingApres: null,
  rpeReel: null,
  remarque: "",
};

type Participant = { code: string };

export default function SaisieSeancePage() {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [queued, setQueued] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (raw) {
      try {
        setDraft(JSON.parse(raw));
      } catch {
        // draft corrompu, on repart de zéro
      }
    }

    fetch("/api/participants")
      .then((r) => r.json())
      .then(setParticipants)
      .catch(() => setParticipants([]));

    setQueued(pendingCount(QUEUE_KEY));

    const sync = () => flushQueue(QUEUE_KEY).then(() => setQueued(pendingCount(QUEUE_KEY)));
    sync();
    window.addEventListener("online", sync);
    return () => window.removeEventListener("online", sync);
  }, []);

  function update(patch: Partial<Draft>) {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
      return next;
    });
  }

  function reset() {
    window.localStorage.removeItem(DRAFT_KEY);
    setDraft(emptyDraft);
    setSaveError(null);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);

    const payload = {
      participantCode: draft.participantCode,
      semaine: draft.semaine,
      numeroSeance: draft.numeroSeance,
      modalite: draft.modalite,
      ordre: draft.ordre,
      heureDebut: draft.heureDebut,
      cravingAvant: draft.cravingAvant,
      cravingApres: draft.cravingApres,
      rpeReel: draft.rpeReel,
      heuresDepuisDerniereConso: draft.heuresDepuisDerniereConso
        ? Number(draft.heuresDepuisDerniereConso)
        : null,
      remarque: draft.remarque || null,
    };

    const result = await submitWithOfflineFallback(
      "/api/mesures-seance",
      payload,
      QUEUE_KEY
    );

    setSaving(false);

    if (!result.ok) {
      setSaveError("Échec de l'enregistrement. Vérifie les champs et réessaie.");
      return;
    }

    setQueued(pendingCount(QUEUE_KEY));
    window.localStorage.removeItem(DRAFT_KEY);
    update({ step: "confirmation" });
  }

  const canStart =
    draft.participantCode && draft.modalite && draft.ordre && draft.semaine && draft.numeroSeance;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto max-w-md">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">Saisie séance</h1>
          {queued > 0 && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
              {queued} en attente de synchro
            </span>
          )}
        </header>

        {draft.step === "setup" && (
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Participant
              </label>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                {participants.map((p) => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => update({ participantCode: p.code })}
                    className={`h-14 rounded-xl text-base font-semibold transition ${
                      draft.participantCode === p.code
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-900 ring-1 ring-slate-200"
                    }`}
                  >
                    {p.code}
                  </button>
                ))}
              </div>
              {participants.length === 0 && (
                <p className="text-sm text-slate-500">Aucun participant enregistré.</p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Modalité</label>
              <div className="grid grid-cols-2 gap-3">
                {(["CARDIO", "MUSCULATION"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => update({ modalite: m })}
                    className={`h-16 rounded-xl text-base font-semibold transition ${
                      draft.modalite === m
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-900 ring-1 ring-slate-200"
                    }`}
                  >
                    {m === "CARDIO" ? "Cardio" : "Musculation"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Position dans la semaine
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(["PREMIERE", "DEUXIEME"] as const).map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => update({ ordre: o })}
                    className={`h-14 rounded-xl text-base font-semibold transition ${
                      draft.ordre === o
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-900 ring-1 ring-slate-200"
                    }`}
                  >
                    {o === "PREMIERE" ? "1ère séance" : "2e séance"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Semaine</label>
                <select
                  value={draft.semaine}
                  onChange={(e) => update({ semaine: Number(e.target.value) })}
                  className="h-14 w-full rounded-xl bg-white px-3 text-base ring-1 ring-slate-200"
                >
                  {Array.from({ length: 6 }, (_, i) => i + 1).map((s) => (
                    <option key={s} value={s}>
                      Semaine {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  N° séance
                </label>
                <select
                  value={draft.numeroSeance}
                  onChange={(e) => update({ numeroSeance: Number(e.target.value) })}
                  className="h-14 w-full rounded-xl bg-white px-3 text-base ring-1 ring-slate-200"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((s) => (
                    <option key={s} value={s}>
                      Séance {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Heures depuis dernière consommation (optionnel)
              </label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={draft.heuresDepuisDerniereConso}
                onChange={(e) => update({ heuresDepuisDerniereConso: e.target.value })}
                className="h-14 w-full rounded-xl bg-white px-4 text-base ring-1 ring-slate-200"
              />
            </div>

            <button
              type="button"
              disabled={!canStart}
              onClick={() => update({ step: "avant", heureDebut: new Date().toISOString() })}
              className="h-16 w-full rounded-2xl bg-slate-900 text-lg font-semibold text-white disabled:opacity-30"
            >
              Continuer
            </button>
          </div>
        )}

        {draft.step === "avant" && (
          <div className="space-y-6">
            <h2 className="text-base font-medium text-slate-700">
              Craving AVANT la séance ({draft.participantCode})
            </h2>
            <ScaleButtons
              value={draft.cravingAvant}
              onChange={(n) => update({ cravingAvant: n })}
              lowLabel="Pas d'envie"
              highLabel="Envie maximale"
            />
            <button
              type="button"
              disabled={draft.cravingAvant === null}
              onClick={() => update({ step: "enCours" })}
              className="h-16 w-full rounded-2xl bg-slate-900 text-lg font-semibold text-white disabled:opacity-30"
            >
              Valider
            </button>
          </div>
        )}

        {draft.step === "enCours" && (
          <div className="flex flex-col items-center justify-center space-y-8 pt-16 text-center">
            <p className="text-xl font-medium text-slate-700">La séance a lieu.</p>
            <button
              type="button"
              onClick={() => update({ step: "apres" })}
              className="h-20 w-full rounded-2xl bg-slate-900 text-xl font-semibold text-white"
            >
              Séance terminée
            </button>
          </div>
        )}

        {draft.step === "apres" && (
          <div className="space-y-6">
            <h2 className="text-base font-medium text-slate-700">
              Craving APRÈS la séance ({draft.participantCode})
            </h2>
            <ScaleButtons
              value={draft.cravingApres}
              onChange={(n) => update({ cravingApres: n })}
              lowLabel="Pas d'envie"
              highLabel="Envie maximale"
            />
            <button
              type="button"
              disabled={draft.cravingApres === null}
              onClick={() => update({ step: "rpe" })}
              className="h-16 w-full rounded-2xl bg-slate-900 text-lg font-semibold text-white disabled:opacity-30"
            >
              Valider
            </button>
          </div>
        )}

        {draft.step === "rpe" && (
          <div className="space-y-6">
            <h2 className="text-base font-medium text-slate-700">RPE réel de la séance</h2>
            <ScaleButtons
              value={draft.rpeReel}
              onChange={(n) => update({ rpeReel: n })}
              lowLabel="Aucun effort"
              highLabel="Effort maximal"
            />
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Remarque (optionnel)
              </label>
              <textarea
                value={draft.remarque}
                onChange={(e) => update({ remarque: e.target.value })}
                rows={3}
                className="w-full rounded-xl bg-white p-4 text-base ring-1 ring-slate-200"
              />
            </div>
            {saveError && <p className="text-sm text-red-600">{saveError}</p>}
            <button
              type="button"
              disabled={draft.rpeReel === null || saving}
              onClick={handleSave}
              className="h-16 w-full rounded-2xl bg-slate-900 text-lg font-semibold text-white disabled:opacity-30"
            >
              {saving ? "Enregistrement..." : "Enregistrer la séance"}
            </button>
          </div>
        )}

        {draft.step === "confirmation" && (
          <div className="flex flex-col items-center justify-center space-y-6 pt-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
              <svg
                viewBox="0 0 24 24"
                className="h-10 w-10 text-emerald-600"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-medium text-slate-900">Séance enregistrée</p>
            <button
              type="button"
              onClick={reset}
              className="h-16 w-full rounded-2xl bg-slate-900 text-lg font-semibold text-white"
            >
              Nouvelle saisie
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
