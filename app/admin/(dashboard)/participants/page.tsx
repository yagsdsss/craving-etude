"use client";

import { useEffect, useState } from "react";

type Participant = {
  code: string;
  groupe: "EXPERIMENTAL" | "CONTROLE";
  age: number;
  sexe: "HOMME" | "FEMME" | "AUTRE";
  sousGroupe: "A" | "B";
};

type ParticipantForm = {
  code: string;
  groupe: Participant["groupe"];
  age: string;
  sexe: Participant["sexe"];
  sousGroupe: Participant["sousGroupe"];
};

const emptyForm: ParticipantForm = {
  code: "",
  groupe: "EXPERIMENTAL",
  age: "",
  sexe: "HOMME",
  sousGroupe: "A",
};

export default function ParticipantsAdminPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    fetch("/api/participants")
      .then((r) => r.json())
      .then(setParticipants);
  }

  useEffect(load, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch("/api/participants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, age: Number(form.age) }),
    });

    setSaving(false);

    if (res.ok) {
      setForm(emptyForm);
      load();
    } else {
      setError("Échec de la création. Vérifie le code (P01-P15) et les champs.");
    }
  }

  async function handleDelete(code: string) {
    await fetch(`/api/participants/${code}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Nouveau participant</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-600">Code (P01-P15)</label>
            <input
              required
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              className="h-11 w-full rounded-lg border border-slate-300 px-3"
              placeholder="P01"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-slate-600">Groupe</label>
              <select
                value={form.groupe}
                onChange={(e) =>
                  setForm((f) => ({ ...f, groupe: e.target.value as Participant["groupe"] }))
                }
                className="h-11 w-full rounded-lg border border-slate-300 px-3"
              >
                <option value="EXPERIMENTAL">Expérimental</option>
                <option value="CONTROLE">Contrôle</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">Sous-groupe</label>
              <select
                value={form.sousGroupe}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sousGroupe: e.target.value as Participant["sousGroupe"] }))
                }
                className="h-11 w-full rounded-lg border border-slate-300 px-3"
              >
                <option value="A">A</option>
                <option value="B">B</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-slate-600">Âge</label>
              <input
                required
                type="number"
                min={18}
                max={30}
                value={form.age}
                onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
                className="h-11 w-full rounded-lg border border-slate-300 px-3"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">Sexe</label>
              <select
                value={form.sexe}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sexe: e.target.value as Participant["sexe"] }))
                }
                className="h-11 w-full rounded-lg border border-slate-300 px-3"
              >
                <option value="HOMME">Homme</option>
                <option value="FEMME">Femme</option>
                <option value="AUTRE">Autre</option>
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="h-11 rounded-lg bg-slate-900 px-5 text-sm font-medium text-white disabled:opacity-40"
          >
            {saving ? "Création..." : "Créer"}
          </button>
        </form>
      </div>

      <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">
          Participants ({participants.length})
        </h2>
        <div className="space-y-2">
          {participants.map((p) => (
            <div
              key={p.code}
              className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-2 text-sm"
            >
              <span className="font-medium text-slate-900">{p.code}</span>
              <span className="text-slate-500">
                {p.groupe === "EXPERIMENTAL" ? "Expérimental" : "Contrôle"} · {p.sousGroupe} ·{" "}
                {p.age} ans · {p.sexe.toLowerCase()}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(p.code)}
                className="text-slate-400 hover:text-red-600"
              >
                Supprimer
              </button>
            </div>
          ))}
          {participants.length === 0 && (
            <p className="text-sm text-slate-400">Aucun participant pour le moment.</p>
          )}
        </div>
      </div>
    </div>
  );
}
