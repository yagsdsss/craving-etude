"use client";

import { useState } from "react";

type Action = {
  id: string;
  titre: string;
  description: string;
  endpoint: string;
};

const ACTIONS: Action[] = [
  {
    id: "carnet",
    titre: "Mettre à jour le carnet de P07",
    description:
      "Régénère le carnet quotidien de P07 (jours oubliés, envie qui stagne autour de 7/10). Ne touche à aucun autre participant.",
    endpoint: "/api/admin/reseed-p07",
  },
  {
    id: "seances",
    titre: "Mettre à jour les séances de P07",
    description:
      "Régénère les 12 séances de P07 du 1ᵉʳ juillet au 10 août 2026 (envie qui remonte après le sport). Ne touche à aucun autre participant.",
    endpoint: "/api/admin/regen-seances-p07",
  },
];

export default function OutilsP07() {
  const [enCours, setEnCours] = useState<string | null>(null);
  const [resultats, setResultats] = useState<Record<string, string>>({});

  async function lancer(action: Action) {
    setEnCours(action.id);
    setResultats((r) => ({ ...r, [action.id]: "" }));
    try {
      const res = await fetch(action.endpoint, { method: "POST" });
      const data = await res.json();
      setResultats((r) => ({
        ...r,
        [action.id]: res.ok
          ? `✅ Fait — ${JSON.stringify(data)}`
          : `❌ Erreur (${res.status}) — ${JSON.stringify(data)}`,
      }));
    } catch (e) {
      setResultats((r) => ({ ...r, [action.id]: `❌ Échec réseau — ${String(e)}` }));
    } finally {
      setEnCours(null);
    }
  }

  return (
    <div className="space-y-4">
      {ACTIONS.map((action) => (
        <div
          key={action.id}
          className="rounded-2xl border border-slate-200 bg-white p-5"
        >
          <p className="font-medium text-slate-900">{action.titre}</p>
          <p className="mt-1 text-sm text-slate-500">{action.description}</p>
          <button
            type="button"
            onClick={() => lancer(action)}
            disabled={enCours !== null}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
          >
            {enCours === action.id ? "En cours…" : "Lancer"}
          </button>
          {resultats[action.id] ? (
            <p className="mt-3 break-all text-xs text-slate-600">{resultats[action.id]}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
