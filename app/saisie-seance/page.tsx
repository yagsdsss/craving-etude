"use client";

import { useEffect, useState } from "react";
import ScaleButtons from "@/components/ScaleButtons";
import LikertButtons from "@/components/LikertButtons";
import { QSU_ITEMS } from "@/lib/qsu";
import { flushQueue, pendingCount, submitWithOfflineFallback } from "@/lib/offlineSync";

const DRAFT_KEY = "seance-draft-v1";
const QUEUE_KEY = "seance-queue-v1";

type Step = "setup" | "avant" | "enCours" | "apres" | "rpe" | "qsu" | "confirmation";

type Draft = {
  step: Step;
  participantCode: string | null;
  modalite: "CARDIO" | "MUSCULATION" | null;
  semaine: number;
  ordre: "PREMIERE" | "DEUXIEME" | null;
  heuresDepuisDerniereConso: string;
  heureDebut: string | null;
  cravingAvant: number | null;
  cravingApres: number | null;
  rpeReel: number | null;
  remarque: string;
  qsu: Record<string, number | null>;
};

const emptyQsu: Record<string, number | null> = Object.fromEntries(
  QSU_ITEMS.map((i) => [i.key, null])
);

const emptyDraft: Draft = {
  step: "setup",
  participantCode: null,
  modalite: null,
  semaine: 1,
  ordre: null,
  heuresDepuisDerniereConso: "",
  heureDebut: null,
  cravingAvant: null,
  cravingApres: null,
  rpeReel: null,
  remarque: "",
  qsu: emptyQsu,
};

/** Chaque semaine ne comporte que 2 séances : la position (1ère/2e) suffit à la déterminer. */
function numeroSeanceDe(semaine: number, ordre: "PREMIERE" | "DEUXIEME") {
  return (semaine - 1) * 2 + (ordre === "PREMIERE" ? 1 : 2);
}

const CODE_PATTERN = /^P(0[1-9]|1[0-9]|20)$/;

/** Sous-groupe A : cardio en 1ère séance ; sous-groupe B : musculation en 1ère séance (contrebalancement). */
function modaliteDe(sousGroupe: "A" | "B", ordre: "PREMIERE" | "DEUXIEME"): "CARDIO" | "MUSCULATION" {
  const premiereModalite = sousGroupe === "A" ? "CARDIO" : "MUSCULATION";
  const deuxiemeModalite = sousGroupe === "A" ? "MUSCULATION" : "CARDIO";
  return ordre === "PREMIERE" ? premiereModalite : deuxiemeModalite;
}

type Participant = { code: string; sousGroupe: "A" | "B" };

export default function SaisieSeancePage() {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [queued, setQueued] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        // fusion avec emptyDraft pour tolérer les brouillons antérieurs (ex : sans QSU)
        setDraft({ ...emptyDraft, ...parsed, qsu: { ...emptyQsu, ...(parsed.qsu ?? {}) } });
        setCodeInput(parsed.participantCode ?? "");
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

  const participant = participants.find((p) => p.code === draft.participantCode) ?? null;

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
      numeroSeance: numeroSeanceDe(draft.semaine, draft.ordre!),
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
      ...draft.qsu,
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

  const canStart = participant && draft.ordre && draft.semaine;

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
                Ton code participant
              </label>
              <input
                type="text"
                placeholder="P01"
                value={codeInput}
                onChange={(e) => {
                  setCodeInput(e.target.value);
                  setCodeError(null);
                }}
                onBlur={() => {
                  if (codeInput === "") return;
                  const normalized = codeInput.trim().toUpperCase();
                  if (!CODE_PATTERN.test(normalized)) {
                    setCodeError("Code invalide. Format attendu : P01 à P20.");
                    update({ participantCode: null });
                    return;
                  }
                  setCodeInput(normalized);
                  if (!participants.some((p) => p.code === normalized)) {
                    setCodeError("Ce code n'existe pas encore — vérifie auprès du coach.");
                    update({ participantCode: null });
                    return;
                  }
                  update({ participantCode: normalized });
                }}
                className="h-14 w-full rounded-xl bg-white px-4 text-center text-xl font-semibold tracking-widest uppercase ring-1 ring-slate-200"
              />
              {codeError && <p className="mt-2 text-sm text-red-600">{codeError}</p>}
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

            {participant && draft.ordre && (
              <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
                Modalité (déterminée par ton sous-groupe {participant.sousGroupe}) :{" "}
                <span className="font-semibold text-slate-900">
                  {modaliteDe(participant.sousGroupe, draft.ordre) === "CARDIO"
                    ? "Cardio"
                    : "Musculation"}
                </span>
              </div>
            )}

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
              onClick={() =>
                update({
                  step: "avant",
                  heureDebut: new Date().toISOString(),
                  modalite: participant ? modaliteDe(participant.sousGroupe, draft.ordre!) : null,
                })
              }
              className="h-16 w-full rounded-2xl bg-slate-900 text-lg font-semibold text-white disabled:opacity-30"
            >
              Continuer
            </button>
          </div>
        )}

        {draft.step === "avant" && (
          <div className="space-y-6">
            <h2 className="text-base font-medium text-slate-700">
              Envie de nicotine AVANT la séance ({draft.participantCode})
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
              Envie de nicotine APRÈS la séance ({draft.participantCode})
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
            <button
              type="button"
              disabled={draft.rpeReel === null}
              onClick={() => update({ step: "qsu" })}
              className="h-16 w-full rounded-2xl bg-slate-900 text-lg font-semibold text-white disabled:opacity-30"
            >
              Continuer vers le questionnaire
            </button>
          </div>
        )}

        {draft.step === "qsu" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-medium text-slate-700">
                Questionnaire (envie de nicotine, juste après la séance)
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Pour chaque phrase, de 1 (pas du tout d&apos;accord) à 7 (tout à fait d&apos;accord).
              </p>
            </div>

            <div className="space-y-5">
              {QSU_ITEMS.map((item, i) => (
                <div key={item.key}>
                  <p className="mb-2 text-sm text-slate-700">
                    {i + 1}. {item.texte}
                  </p>
                  <LikertButtons
                    value={draft.qsu[item.key]}
                    onChange={(n) =>
                      update({ qsu: { ...draft.qsu, [item.key]: n } })
                    }
                  />
                </div>
              ))}
            </div>

            {saveError && <p className="text-sm text-red-600">{saveError}</p>}
            <button
              type="button"
              disabled={saving}
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
