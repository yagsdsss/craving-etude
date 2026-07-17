"use client";

import { useEffect, useMemo, useState } from "react";
import { FAGERSTROM_ITEMS, computeFagerstromScore } from "@/lib/fagerstrom";
import { computeImc } from "@/lib/imc";

type Participant = { code: string };

const emptyForm = {
  participantCode: "",
  temps: "T0" as "T0" | "T1" | "T2",
  consoMoyenneSemaine: "",
  poids: "",
  taille: "",
  tourTaille: "",
  envieArreter: "",
  capaciteReduireConso: "",
};

const emptyFager: Record<string, number | null> = Object.fromEntries(
  FAGERSTROM_ITEMS.map((i) => [i.key, null])
);

function toNumberOrNull(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

export default function SaisieSuiviPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [fager, setFager] = useState<Record<string, number | null>>(emptyFager);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/participants")
      .then((r) => r.json())
      .then(setParticipants)
      .catch(() => setParticipants([]));
  }, []);

  const scoreFagerstrom = useMemo(() => computeFagerstromScore(fager), [fager]);
  const imc = useMemo(
    () => computeImc(toNumberOrNull(form.poids), toNumberOrNull(form.taille)),
    [form.poids, form.taille]
  );

  function field(key: keyof typeof form) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((prev) => ({ ...prev, [key]: e.target.value })),
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const payload = {
      participantCode: form.participantCode,
      temps: form.temps,
      consoMoyenneSemaine: toNumberOrNull(form.consoMoyenneSemaine),
      poids: toNumberOrNull(form.poids),
      taille: toNumberOrNull(form.taille),
      tourTaille: toNumberOrNull(form.tourTaille),
      envieArreter: toNumberOrNull(form.envieArreter),
      capaciteReduireConso: toNumberOrNull(form.capaciteReduireConso),
      ...fager,
    };

    const res = await fetch("/api/mesures-suivi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (res.ok) {
      setMessage({ type: "ok", text: "Mesure enregistrée." });
      setForm((prev) => ({ ...emptyForm, participantCode: prev.participantCode, temps: prev.temps }));
      setFager(emptyFager);
    } else {
      setMessage({ type: "error", text: "Échec de l'enregistrement. Vérifie les champs." });
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-xl font-semibold text-slate-900">Mesures de suivi (T0 / T1 / T2)</h1>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl bg-white p-8 ring-1 ring-slate-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Participant</label>
              <select
                required
                value={form.participantCode}
                onChange={(e) => setForm((prev) => ({ ...prev, participantCode: e.target.value }))}
                className="h-11 w-full rounded-lg border border-slate-300 px-3"
              >
                <option value="" disabled>
                  Sélectionner
                </option>
                {participants.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.code}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Temps de mesure</label>
              <select
                value={form.temps}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, temps: e.target.value as "T0" | "T1" | "T2" }))
                }
                className="h-11 w-full rounded-lg border border-slate-300 px-3"
              >
                <option value="T0">T0</option>
                <option value="T1">T1</option>
                <option value="T2">T2</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <NumberField label="Conso moyenne / semaine" {...field("consoMoyenneSemaine")} />
            <NumberField label="Tour de taille (cm)" {...field("tourTaille")} />
            <NumberField label="Poids (kg)" {...field("poids")} />
            <NumberField label="Taille (cm)" {...field("taille")} />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">IMC (auto)</label>
              <div className="flex h-11 items-center rounded-lg bg-slate-50 px-3 text-sm text-slate-600">
                {imc ?? "—"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NumberField
              label="Envie d'arrêter la nicotine (0-10)"
              min={0}
              max={10}
              {...field("envieArreter")}
            />
            <NumberField
              label="Capacité perçue à réduire sa consommation (0-10)"
              hint="Si vous décidiez de réduire votre consommation, à quel point vous sentez-vous capable d'y arriver ?"
              min={0}
              max={10}
              {...field("capaciteReduireConso")}
            />
          </div>

          <div className="border-t border-slate-100 pt-6">
            <h2 className="mb-1 text-sm font-semibold text-slate-800">
              Test de Fagerström (dépendance à la nicotine)
            </h2>
            <p className="mb-4 text-xs text-slate-400">
              Sélectionne une réponse par question. Le score total (0-10) est calculé automatiquement.
            </p>

            <div className="space-y-5">
              {FAGERSTROM_ITEMS.map((item, i) => (
                <div key={item.key}>
                  <p className="mb-2 text-sm text-slate-700">
                    {i + 1}. {item.texte}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {item.options.map((opt, idx) => {
                      const selected = fager[item.key] === idx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setFager((prev) => ({ ...prev, [item.key]: idx }))}
                          className={`rounded-lg px-3 py-2 text-sm transition ${
                            selected
                              ? "bg-slate-900 text-white"
                              : "bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-slate-300"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Score de Fagerström :{" "}
              <span className="font-medium text-slate-900">{scoreFagerstrom ?? "—"}</span> / 10
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Laisse un champ vide si la donnée est manquante — elle sera enregistrée comme telle,
            jamais comme zéro.
          </p>

          {message && (
            <p className={message.type === "ok" ? "text-sm text-emerald-600" : "text-sm text-red-600"}>
              {message.text}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="h-12 rounded-lg bg-slate-900 px-6 text-sm font-medium text-white disabled:opacity-40"
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </form>
      </div>
    </div>
  );
}

function NumberField({
  label,
  hint,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {hint && <p className="mb-1 text-xs italic text-slate-400">« {hint} »</p>}
      <input
        type="number"
        step="any"
        min={min}
        max={max}
        value={value}
        onChange={onChange}
        placeholder="—"
        className="h-11 w-full rounded-lg border border-slate-300 px-3"
      />
    </div>
  );
}
