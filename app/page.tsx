import Link from "next/link";

const LINKS = [
  { href: "/saisie-seance", label: "Saisie séance", desc: "Envie de nicotine avant/après, RPE — en salle" },
  { href: "/carnet", label: "Carnet du jour", desc: "Pour les participants, chaque soir" },
  { href: "/saisie-suivi", label: "Mesures T0 / T1 / T2", desc: "Suivi complet, sur ordinateur" },
  { href: "/admin", label: "Tableau de bord", desc: "Graphiques, statistiques, exports (protégé)" },
];

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md space-y-3">
        <h1 className="mb-6 text-center text-lg font-semibold text-slate-900">
          Étude craving &amp; activité physique
        </h1>
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="block rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300"
          >
            <p className="font-medium text-slate-900">{l.label}</p>
            <p className="text-sm text-slate-500">{l.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
