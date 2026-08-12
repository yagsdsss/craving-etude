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
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
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
    nParticipants: number;
    nSeances: number;
    cohensD: number | null;
  };
  delta: {
    chart: { label: string; moyenne: number; ecartType: number }[];
    cohensD: number | null;
    nParticipants: number;
    nSeancesCardio: number;
    nSeancesMuscu: number;
  };
  rpe: {
    chart: { label: string; moyenne: number }[];
    ecartAbsolu: number | null;
  };
  qsuSemaine: { semaine: string; score: number | null }[];
  consommation: { semaine: string; experimental: number | null; controle: number | null }[];
  envieSemaine: { semaine: string; experimental: number | null; controle: number | null }[];
  delaiConso: {
    points: { heures: number; craving: number; modalite: string }[];
    n: number;
    nAbstinents: number;
    correlation: number | null;
    heuresMoyenne: number | null;
  };
  motivation: {
    chart: {
      temps: string;
      envieExp: number | null;
      envieCtrl: number | null;
      capaciteExp: number | null;
      capaciteCtrl: number | null;
    }[];
    evolutionEnvieExp: number | null;
    evolutionCapaciteExp: number | null;
  };
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

// Libellés d'axes : indiquent ce qui est mesuré et dans quelle unité.
const AXE_STYLE = { fontSize: 11, fill: "#94A3B8" };
const axeX = (value: string) => ({
  value,
  position: "insideBottom" as const,
  offset: -10,
  ...AXE_STYLE,
});
const axeY = (value: string) => ({
  value,
  angle: -90,
  position: "insideLeft" as const,
  style: { textAnchor: "middle" as const },
  ...AXE_STYLE,
});
// Marges laissant la place aux libellés d'axes.
const MARGES = { top: 8, right: 12, bottom: 28, left: 4 };

export default function DashboardCharts({
  avantApres,
  delta,
  rpe,
  qsuSemaine,
  consommation,
  envieSemaine,
  motivation,
  delaiConso,
  trajectoires,
  participantCodes,
  presence,
  effetSemaine,
  recapHebdo,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card title="Craving avant vs après séance (moyenne sur toutes les séances)">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={avantApres.chart} margin={MARGES}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
            <XAxis dataKey="label" label={axeX("Moment de la mesure")} />
            <YAxis domain={[0, 10]} label={axeY("Envie de nicotine (0-10)")} />
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
          <StatLine label="n (participants)" value={String(avantApres.nParticipants)} />
          <StatLine label="Séances agrégées" value={String(avantApres.nSeances)} />
          <StatLine label="d de Cohen (dz apparié)" value={fmt(avantApres.cohensD)} />
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Chaque participant fournit plusieurs séances : elles sont d&apos;abord moyennées par
          participant, puis comparées en apparié. L&apos;unité d&apos;analyse est le participant
          (n={avantApres.nParticipants}), pas la séance — sinon les observations ne seraient pas
          indépendantes.
        </p>
      </Card>

      <Card title="Delta craving par modalité (cardio vs musculation)">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={delta.chart} margin={MARGES}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
            <XAxis dataKey="label" label={axeX("Modalité de la séance")} />
            <YAxis label={axeY("Variation d'envie (après − avant)")} />
            <Tooltip />
            <Bar dataKey="moyenne" fill={EMERALD} radius={[6, 6, 0, 0]}>
              <ErrorBar dataKey="ecartType" width={4} strokeWidth={2} stroke="#334155" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4">
          <StatLine label="n (participants)" value={String(delta.nParticipants)} />
          <StatLine
            label="Séances agrégées (cardio / muscu)"
            value={`${delta.nSeancesCardio} / ${delta.nSeancesMuscu}`}
          />
          <StatLine
            label="d de Cohen (dz apparié, muscu vs cardio)"
            value={fmt(delta.cohensD)}
          />
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Tous les participants réalisent les deux modalités : la comparaison est intra-sujet.
          Les séances sont moyennées par participant, puis comparées en apparié
          (n={delta.nParticipants}). Les barres montrent l&apos;écart-type entre participants.
        </p>
      </Card>

      <Card title="Envie avant séance selon le délai depuis la dernière consommation">
        <ResponsiveContainer width="100%" height={260}>
          <ScatterChart margin={MARGES}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
            <XAxis
              type="number"
              dataKey="heures"
              name="Délai depuis la dernière conso"
              unit=" h"
              domain={[0, "dataMax"]}
              label={axeX("Délai depuis la dernière consommation (heures)")}
            />
            <YAxis
              type="number"
              dataKey="craving"
              name="Envie avant séance"
              domain={[0, 10]}
              label={axeY("Envie avant séance (0-10)")}
            />
            <ZAxis range={[45, 45]} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            <Legend verticalAlign="top" height={28} />
            <Scatter
              name="Cardio"
              data={delaiConso.points.filter((p) => p.modalite === "CARDIO")}
              fill={INDIGO}
              fillOpacity={0.65}
            />
            <Scatter
              name="Musculation"
              data={delaiConso.points.filter((p) => p.modalite === "MUSCULATION")}
              fill={EMERALD}
              fillOpacity={0.65}
            />
          </ScatterChart>
        </ResponsiveContainer>
        <div className="mt-4">
          <StatLine label="n (séances)" value={String(delaiConso.n)} />
          <StatLine label="Délai moyen" value={`${fmt(delaiConso.heuresMoyenne)} h`} />
          <StatLine label="Corrélation (r de Pearson)" value={fmt(delaiConso.correlation)} />
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Chaque point est une séance. Permet de vérifier que l&apos;envie mesurée avant
          l&apos;effort dépend du temps écoulé depuis la dernière prise — un facteur à contrôler
          avant d&apos;attribuer un effet au sport. {delaiConso.nAbstinents} séance(s) au-delà de
          24 h sans consommation sont écartées : le manque aigu y est déjà passé.{" "}
          <strong className="font-medium">
            Le r est calculé sur les séances, qui se répètent chez les mêmes participants : à lire
            comme une tendance descriptive, pas comme un test.
          </strong>
        </p>
      </Card>

      <Card title="Score QSU-Brief moyen par semaine (fin de séance)">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={qsuSemaine} margin={MARGES}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
            <XAxis dataKey="semaine" label={axeX("Semaine de l'étude")} />
            <YAxis domain={[1, 7]} label={axeY("Score QSU-Brief (1-7)")} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="score"
              name="Score QSU"
              stroke={INDIGO}
              strokeWidth={2}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
        <p className="mt-3 text-xs text-slate-400">
          Craving (QSU-Brief) mesuré juste après chaque séance — groupe expérimental.
        </p>
      </Card>

      <Card title="Consommation quotidienne moyenne — semaine par semaine">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={consommation} margin={MARGES}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
            <XAxis dataKey="semaine" label={axeX("Semaine de l'étude")} />
            <YAxis label={axeY("Conso/jour (équiv. cigarettes)")} />
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

      <Card title="Envie quotidienne moyenne — semaine par semaine (carnet)">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={envieSemaine} margin={MARGES}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
            <XAxis dataKey="semaine" label={axeX("Semaine de l'étude")} />
            <YAxis domain={[0, 10]} label={axeY("Envie quotidienne (0-10)")} />
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
        <p className="mt-3 text-xs text-slate-400">
          Envie moyenne déclarée chaque jour (hors séance) — montre l&apos;évolution du craving sur
          la durée de l&apos;étude.
        </p>
      </Card>

      <Card title="Envie d'arrêter et capacité perçue — T0 / T1 / T2">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={motivation.chart} margin={MARGES}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
            <XAxis dataKey="temps" label={axeX("Temps de mesure")} />
            <YAxis domain={[0, 10]} label={axeY("Score déclaré (0-10)")} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="envieExp"
              name="Envie d'arrêter — Exp."
              stroke={INDIGO}
              strokeWidth={2}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="capaciteExp"
              name="Capacité perçue — Exp."
              stroke={EMERALD}
              strokeWidth={2}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="envieCtrl"
              name="Envie d'arrêter — Ctrl."
              stroke={SLATE}
              strokeWidth={2}
              strokeDasharray="4 4"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="capaciteCtrl"
              name="Capacité perçue — Ctrl."
              stroke={AMBER}
              strokeWidth={2}
              strokeDasharray="4 4"
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-4">
          <StatLine
            label="Évolution envie d'arrêter (exp., T0 → T2)"
            value={fmt(motivation.evolutionEnvieExp)}
          />
          <StatLine
            label="Évolution capacité perçue (exp., T0 → T2)"
            value={fmt(motivation.evolutionCapaciteExp)}
          />
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Échelles 0-10. Traits pleins : groupe expérimental ; pointillés : groupe contrôle.
        </p>
      </Card>

      <Card
        title={`Trajectoires individuelles — consommation par semaine (n=${participantCodes.length})`}
      >
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trajectoires} margin={MARGES}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
            <XAxis dataKey="semaine" label={axeX("Semaine de l'étude")} />
            <YAxis label={axeY("Conso/jour (équiv. cigarettes)")} />
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
          <BarChart data={rpe.chart} margin={MARGES}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
            <XAxis dataKey="label" label={axeX("Modalité de la séance")} />
            <YAxis domain={[0, 10]} label={axeY("RPE perçu (0-10)")} />
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
          <BarChart data={presence} margin={MARGES}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
            <XAxis dataKey="code" label={axeX("Participant")} />
            <YAxis domain={[0, 100]} label={axeY("Séances réalisées (%)")} />
            <Tooltip />
            <Bar dataKey="tauxPresence" fill={INDIGO} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <p className="mt-3 text-xs text-slate-400">
          Séances réalisées sur les 12 prévues (2/semaine × 6 semaines). Groupe expérimental
          uniquement — le groupe contrôle ne suit pas de programme.
        </p>
      </Card>

      <Card title="Effet séance par semaine (envie avant / après et delta)">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={effetSemaine} margin={MARGES}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
            <XAxis dataKey="semaine" label={axeX("Semaine de l'étude")} />
            <YAxis label={axeY("Envie de nicotine (0-10)")} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="avant" name="Envie avant" stroke={INDIGO} strokeWidth={2} />
            <Line type="monotone" dataKey="apres" name="Envie après" stroke={SLATE} strokeWidth={2} />
            <Line type="monotone" dataKey="delta" name="Delta" stroke={EMERALD} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
        <p className="mt-3 text-xs text-slate-400">
          Delta = envie après − avant : positif si la séance fait monter l&apos;envie, négatif si
          elle la fait baisser. Montre comment cet effet évolue au fil des semaines.
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
    </div>
  );
}
