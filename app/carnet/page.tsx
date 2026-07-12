"use client";

import { useEffect, useState } from "react";
import ScaleButtons from "@/components/ScaleButtons";
import { flushQueue, pendingCount, submitWithOfflineFallback } from "@/lib/offlineSync";

const QUEUE_KEY = "carnet-queue-v1";
const CODE_PATTERN = /^P(0[1-9]|1[0-5])$/;

type Step = "code" | "form" | "confirmation";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function CarnetPage() {
  const [step, setStep] = useState<Step>("code");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [queued, setQueued] = useState(0);

  const [cigarettes, setCigarettes] = useState("");
  const [puffPrises, setPuffPrises] = useState("");
  const [snusSachets, setSnusSachets] = useState("");
  const [cravingMoyenJour, setCravingMoyenJour] = useState<number | null>(null);
  const [evenementParticulier, setEvenementParticulier] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setQueued(pendingCount(QUEUE_KEY));
    const sync = () => flushQueue(QUEUE_KEY).then(() => setQueued(pendingCount(QUEUE_KEY)));
    sync();
    window.addEventListener("online", sync);
    return () => window.removeEventListener("online", sync);
  }, []);

  function handleCodeSubmit() {
    const normalized = code.trim().toUpperCase();
    if (!CODE_PATTERN.test(normalized)) {
      setCodeError("Code invalide. Format attendu : P01 à P15.");
      return;
    }
    setCode(normalized);
    setCodeError(null);
    setStep("form");
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);

    const payload = {
      participantCode: code,
      date: todayIso(),
      cigarettes: cigarettes ? Number(cigarettes) : null,
      puffPrises: puffPrises ? Number(puffPrises) : null,
      snusSachets: snusSachets ? Number(snusSachets) : null,
      cravingMoyenJour,
      evenementParticulier: evenementParticulier || null,
    };

    const result = await submitWithOfflineFallback("/api/carnet-jour", payload, QUEUE_KEY);
    setSaving(false);

    if (!result.ok) {
      setSaveError("Échec de l'enregistrement. Réessaie.");
      return;
    }

    setQueued(pendingCount(QUEUE_KEY));
    setStep("confirmation");
  }

  function reset() {
    setStep("code");
    setCode("");
    setCigarettes("");
    setPuffPrises("");
    setSnusSachets("");
    setCravingMoyenJour(null);
    setEvenementParticulier("");
    setSaveError(null);
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto max-w-md">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">Carnet du jour</h1>
          {queued > 0 && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
              {queued} en attente
            </span>
          )}
        </header>

        {step === "code" && (
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Ton code participant
              </label>
              <input
                type="text"
                autoFocus
                placeholder="P01"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="h-16 w-full rounded-xl bg-white px-4 text-center text-2xl font-semibold tracking-widest uppercase ring-1 ring-slate-200"
              />
              {codeError && <p className="mt-2 text-sm text-red-600">{codeError}</p>}
            </div>
            <button
              type="button"
              onClick={handleCodeSubmit}
              className="h-16 w-full rounded-2xl bg-slate-900 text-lg font-semibold text-white"
            >
              Continuer
            </button>
          </div>
        )}

        {step === "form" && (
          <div className="space-y-6">
            <p className="text-sm text-slate-500">{code} — {todayIso()}</p>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Cigarettes</label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={cigarettes}
                onChange={(e) => setCigarettes(e.target.value)}
                className="h-14 w-full rounded-xl bg-white px-4 text-base ring-1 ring-slate-200"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Puffs prises
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={puffPrises}
                onChange={(e) => setPuffPrises(e.target.value)}
                className="h-14 w-full rounded-xl bg-white px-4 text-base ring-1 ring-slate-200"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Sachets de snus
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={snusSachets}
                onChange={(e) => setSnusSachets(e.target.value)}
                className="h-14 w-full rounded-xl bg-white px-4 text-base ring-1 ring-slate-200"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Craving moyen aujourd&apos;hui
              </label>
              <ScaleButtons
                value={cravingMoyenJour}
                onChange={setCravingMoyenJour}
                lowLabel="Pas d'envie"
                highLabel="Envie maximale"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Événement particulier (optionnel)
              </label>
              <textarea
                value={evenementParticulier}
                onChange={(e) => setEvenementParticulier(e.target.value)}
                rows={3}
                className="w-full rounded-xl bg-white p-4 text-base ring-1 ring-slate-200"
              />
            </div>

            {saveError && <p className="text-sm text-red-600">{saveError}</p>}

            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="h-16 w-full rounded-2xl bg-slate-900 text-lg font-semibold text-white disabled:opacity-30"
            >
              {saving ? "Enregistrement..." : "Enregistrer ma journée"}
            </button>
          </div>
        )}

        {step === "confirmation" && (
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
            <p className="text-lg font-medium text-slate-900">Journée enregistrée</p>
            <button
              type="button"
              onClick={reset}
              className="h-16 w-full rounded-2xl bg-slate-900 text-lg font-semibold text-white"
            >
              Terminé
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
