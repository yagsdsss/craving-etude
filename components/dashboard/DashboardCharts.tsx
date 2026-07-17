"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ErrorBar,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const INDIGO = "#5E5CE6";
const SLATE = "#94A3B8";
const EMERALD = "#10B981";
const AMBER = "#F59E0B";

const PARTICIPANT_COLORS = [
  "#5E5CE6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#0EA5E9",
  "#A855F7",
  "#EC4899",
  "#84CC16",
  "#14B8A6",
  "#F97316",
  "#6366F1",
  "#22D3EE",
  "#D946EF",
  "#65A30D",
  "#DC2626",
  "#0D9488",
  "#CA8A04",
  "#7C3AED",
  "#DB2777",
  "#4D7C0F",
];

type Props = {
  avantApres: {
    chart: { label: string; moyenne: number }[];
    moyenneAvant: number | null;
    ecartTypeAvant: number | null;
    moyenneApres: number | null;
    ecartTypeApres: number | null;
    n: number;
    cohensD: number | null;
  };
  delta: {
    chart: { label: string; moyenne: number; ecartType: number }[];
    cohensD: number | null;
    nCardio: number;
    nMuscu: number;
  };
  rpe: {
    chart: { label: string; moyenne: number }[];
    ecartAbsolu: number | null;
  };
  cravingTrait: { temps: string; experimental: number | null; controle: number | null }[];
  consommation: { semaine: string; experimental: number | null; controle: number | null }[];
  trajectoires: Record<string, number | string | null>[];
  participantCodes: string[];
  presence: { code: string; tauxPresence: number | null }[];
  effetSemaine: { semaine: string; avant: number; apres: number; delta: number; n: number }[];
  recapHebdo: {
    code: string;
    groupe: string;
    semaine: number;
    envieMoyenne: number | null;
    deltaSeance: number | null;
    consoMoyenne: number | null;
  }[];
  manquantes: {
    mesureSeance: { champ: string; manquants: number; total: number }[];
    carnetJour: { champ: string; manquants: number; total: number }[];
    mesureSuivi: { champ: string; manquants: number; total: number }[];
  };
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">{title}</h3>
      {children}
    </div>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-100 py-1.5 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}

const fmt = (v: number | null) => (v === null ? "—" : v.toString());

export default function DashboardCharts({
  avantApres,
  delta,
  rpe,
  cravingTrait,
  consommation,
  trajectoires,
  participantCodes,
  presence,
  effetSemaine,
  recapHebdo,
  manquantes,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card title="Craving avant vs après séance (moyenne sur toutes les séances)">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={avantApres.chart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
            <XAxis dataKey="label" />
            <YAxis domain={[0, 10]} />
            <Tooltip />
            <Bar dataKey="moyenne" fill={INDIGO} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4">
          <StatLine
            label="Avant"
            value={`${fmt(avantApres.moyenneAvant)} ± ${fmt(avantApres.ecartTypeAvant)}`}
          />
          <StatLine
            label="Après"
            value={`${fmt(avantApres.moyenneApres)} ± ${fmt(avantApres.ecartTypeApres)}`}
          />
          <StatLine label="n (paires)" value={String(avantApres.n)} />
          <StatLine label="d de Cohen (apparié)" value={fmt(avantApres.cohensD)} />
        </div>
      </Card>

      <Card title="Delta craving par modalité (cardio vs musculation)">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={delta.chart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="moyenne" fill={EMERALD} radius={[6, 6, 0, 0]}>
              <ErrorBar dataKey="ecartType" width={4} strokeWidth={2} stroke="#334155" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4">
          <StatLine label="n cardio / musculation" value={`${delta.nCardio} / ${delta.nMuscu}`} />
          <StatLine label="d de Cohen (groupes indépendants)" value={fmt(delta.cohensD)} />
        </div>
      </Card>

      <Card title="Évolution du craving trait — expérimental vs contrôle">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={cravingTrait}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
            <XAxis dataKey="temps" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="experimental"
              name="Expérimental"
              stroke={INDIGO}
              strokeWidth={2}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="controle"
              name="Contrôle"
              stroke={SLATE}
              strokeWidth={2}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Consommation quotidienne moyenne — semaine par semaine">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={consommation}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
            <XAxis dataKey="semaine" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="experimental"
              name="Expérimental"
              stroke={INDIGO}
              strokeWidth={2}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="controle"
              name="Contrôle"
              stroke={SLATE}
              strokeWidth={2}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card
        title={`Trajectoires individuelles — consommation par semaine (n=${participantCodes.length})`}
      >
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trajectoires}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
            <XAxis dataKey="semaine" />
            <YAxis />
            <Tooltip />
            {participantCodes.map((code, i) => (
              <Line
                key={code}
                type="monotone"
                dataKey={code}
                stroke={PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length]}
                strokeWidth={1.5}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card title="RPE réel — cardio vs musculation (contrôle de validité)">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={rpe.chart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
            <XAxis dataKey="label" />
            <YAxis domain={[0, 10]} />
            <Tooltip />
            <Bar dataKey="moyenne" fill={AMBER} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4">
          <StatLine label="Écart absolu cardio / musculation" value={fmt(rpe.ecartAbsolu)} />
        </div>
      </Card>

      <Card title="Taux de présence par participant">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={presence}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
            <XAxis dataKey="code" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Bar dataKey="tauxPresence" fill={INDIGO} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Effet séance par semaine (envie avant / après et delta)">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={effetSemaine}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
            <XAxis dataKey="semaine" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="avant" name="Envie avant" stroke={INDIGO} strokeWidth={2} />
            <Line type="monotone" dataKey="apres" name="Envie après" stroke={SLATE} strokeWidth={2} />
            <Line type="monotone" dataKey="delta" name="Delta" stroke={EMERALD} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
        <p className="mt-3 text-xs text-slate-400">
          Montre si la réduction d&apos;envie par séance (delta) s&apos;accentue au fil des semaines.
        </p>
      </Card>

      <Card title="Récapitulatif hebdomadaire par participant">
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-2 py-2 font-medium">Participant</th>
                <th className="px-2 py-2 font-medium">Groupe</th>
                <th className="px-2 py-2 font-medium">Sem.</th>
                <th className="px-2 py-2 font-medium">Envie moy.</th>
                <th className="px-2 py-2 font-medium">Delta séance</th>
                <th className="px-2 py-2 font-medium">Conso (éq. cig.)</th>
              </tr>
            </thead>
            <tbody>
              {recapHebdo.map((r) => (
                <tr key={`${r.code}-${r.semaine}`} className="border-t border-slate-100">
                  <td className="px-2 py-1.5 font-medium text-slate-900">{r.code}</td>
                  <td className="px-2 py-1.5 text-slate-500">
                    {r.groupe === "EXPERIMENTAL" ? "Exp." : "Ctrl."}
                  </td>
                  <td className="px-2 py-1.5 text-slate-700">S{r.semaine}</td>
                  <td className="px-2 py-1.5 text-slate-700">{fmt(r.envieMoyenne)}</td>
                  <td className="px-2 py-1.5 text-slate-700">{fmt(r.deltaSeance)}</td>
                  <td className="px-2 py-1.5 text-slate-700">{fmt(r.consoMoyenne)}</td>
                </tr>
              ))}
              {recapHebdo.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-2 py-4 text-sm text-slate-400">
                    Aucune donnée hebdomadaire pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Conso en équivalent cigarette : cigarettes + puff (% → éq. cig.) + snus (1 sachet = 1).
        </p>
      </Card>

      <Card title="Données manquantes">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MissingTable title="Séances" rows={manquantes.mesureSeance} />
          <MissingTable title="Carnet" rows={manquantes.carnetJour} />
          <MissingTable title="Suivi T0/T1/T2" rows={manquantes.mesureSuivi} />
        </div>
      </Card>
    </div>
  );
}

function MissingTable({
  title,
  rows,
}: {
  title: string;
  rows: { champ: string; manquants: number; total: number }[];
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      {rows.map((r) => (
        <div key={r.champ} className="flex items-baseline justify-between gap-3 text-sm">
          <span className="truncate text-slate-500">{r.champ}</span>
          <span className="shrink-0 font-medium text-slate-900">
            {r.manquants} / {r.total}
          </span>
        </div>
      ))}
    </div>
  );
}
