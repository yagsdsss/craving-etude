"use client";

import { useEffect, useMemo, useState } from "react";

export type FieldType = "text" | "textarea" | "number" | "select" | "date" | "datetime";

export type FieldConfig = {
  key: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  readOnly?: boolean;
};

type Props = {
  listEndpoint: string; // GET, renvoie un tableau
  itemEndpoint: (row: Record<string, unknown>) => string; // PATCH/DELETE d'une ligne
  idField: string;
  fields: FieldConfig[];
  // colonnes affichées dans le tableau (résumé)
  summaryFields: string[];
};

function toInputValue(type: FieldType, value: unknown): string {
  if (value === null || value === undefined) return "";
  if (type === "date") {
    // ISO -> YYYY-MM-DD
    return new Date(value as string).toISOString().slice(0, 10);
  }
  if (type === "datetime") {
    // ISO -> YYYY-MM-DDTHH:mm (heure locale)
    const d = new Date(value as string);
    const off = d.getTimezoneOffset();
    const local = new Date(d.getTime() - off * 60000);
    return local.toISOString().slice(0, 16);
  }
  return String(value);
}

function fromInputValue(field: FieldConfig, raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (field.type === "number") return Number(trimmed);
  return trimmed; // text, select, date, datetime -> string (le serveur convertit les dates)
}

function displayValue(type: FieldType, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (type === "date") return new Date(value as string).toISOString().slice(0, 10);
  if (type === "datetime") return new Date(value as string).toLocaleString("fr-FR");
  return String(value);
}

export default function DataEditor({
  listEndpoint,
  itemEndpoint,
  idField,
  fields,
  summaryFields,
}: Props) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch(listEndpoint)
      .then((r) => r.json())
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }

  useEffect(load, [listEndpoint]);

  const filtered = useMemo(() => {
    if (!filter.trim()) return rows;
    const f = filter.trim().toUpperCase();
    return rows.filter((r) => String(r.participantCode ?? r.code ?? "").toUpperCase().includes(f));
  }, [rows, filter]);

  function openEdit(row: Record<string, unknown>) {
    setEditing(row);
    setError(null);
    const initial: Record<string, string> = {};
    for (const field of fields) {
      initial[field.key] = toInputValue(field.type, row[field.key]);
    }
    setForm(initial);
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    setError(null);

    const payload: Record<string, unknown> = {};
    for (const field of fields) {
      if (field.readOnly) continue;
      payload[field.key] = fromInputValue(field, form[field.key] ?? "");
    }

    const res = await fetch(itemEndpoint(editing), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (res.ok) {
      setEditing(null);
      load();
    } else {
      setError("Échec de l'enregistrement. Vérifie les valeurs (ex : échelles, dates).");
    }
  }

  async function handleDelete(row: Record<string, unknown>) {
    const label = String(row.participantCode ?? row.code ?? row[idField]);
    if (!window.confirm(`Supprimer définitivement cette ligne (${label}) ?`)) return;
    const res = await fetch(itemEndpoint(row), { method: "DELETE" });
    if (res.ok) load();
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <input
          type="text"
          placeholder="Filtrer par code (ex : P01)"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-10 w-64 rounded-lg border border-slate-300 px-3 text-sm"
        />
        <span className="text-sm text-slate-500">{filtered.length} ligne(s)</span>
        <button
          type="button"
          onClick={load}
          className="ml-auto rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
        >
          Rafraîchir
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Chargement…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-400">Aucune donnée.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {summaryFields.map((k) => {
                  const field = fields.find((f) => f.key === k);
                  return (
                    <th key={k} className="px-3 py-2 font-medium">
                      {field?.label ?? k}
                    </th>
                  );
                })}
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={String(row[idField])} className="border-t border-slate-100">
                  {summaryFields.map((k) => {
                    const field = fields.find((f) => f.key === k);
                    return (
                      <td key={k} className="px-3 py-2 text-slate-700">
                        {displayValue(field?.type ?? "text", row[k])}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openEdit(row)}
                      className="mr-3 text-slate-700 hover:text-slate-900"
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(row)}
                      className="text-slate-400 hover:text-red-600"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Modifier — {String(editing.participantCode ?? editing.code ?? editing[idField])}
              </h3>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                Fermer
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {fields.map((field) => (
                <div key={field.key} className={field.type === "textarea" ? "col-span-2" : ""}>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    {field.label}
                    {field.readOnly && " (auto)"}
                  </label>
                  {field.readOnly ? (
                    <div className="h-10 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
                      {displayValue(field.type, editing[field.key])}
                    </div>
                  ) : field.type === "select" ? (
                    <select
                      value={form[field.key] ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                      className="h-10 w-full rounded-lg border border-slate-300 px-2 text-sm"
                    >
                      {field.options?.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea
                      value={form[field.key] ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                      rows={2}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  ) : (
                    <input
                      type={
                        field.type === "number"
                          ? "number"
                          : field.type === "date"
                            ? "date"
                            : field.type === "datetime"
                              ? "datetime-local"
                              : "text"
                      }
                      value={form[field.key] ?? ""}
                      min={field.min}
                      max={field.max}
                      step={field.step ?? (field.type === "number" ? "any" : undefined)}
                      onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                    />
                  )}
                </div>
              ))}
            </div>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
