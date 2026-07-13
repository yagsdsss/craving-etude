import { prisma } from "@/lib/prisma";
import {
  avantApresGlobal,
  consommationParSemaine,
  cravingTraitParTemps,
  deltaParModalite,
  donneesManquantes,
  rpeParModalite,
  tauxPresenceParParticipant,
  trajectoiresIndividuelles,
} from "@/lib/analytics";
import DashboardCharts from "@/components/dashboard/DashboardCharts";

export const dynamic = "force-dynamic";

const EXPORTS = [
  { table: "participants", label: "Participants" },
  { table: "mesures-seance", label: "Mesures séance" },
  { table: "carnet-jour", label: "Carnet jour" },
  { table: "mesures-suivi", label: "Mesures suivi" },
];

export default async function AdminDashboardPage() {
  const [participants, seances, carnets, suivis] = await Promise.all([
    prisma.participant.findMany({ orderBy: { code: "asc" } }),
    prisma.mesureSeance.findMany(),
    prisma.carnetJour.findMany(),
    prisma.mesureSuivi.findMany(),
  ]);

  const data = {
    avantApres: avantApresGlobal(seances),
    delta: deltaParModalite(seances),
    rpe: rpeParModalite(seances),
    cravingTrait: cravingTraitParTemps(suivis, participants),
    consommation: consommationParSemaine(carnets, participants),
    trajectoires: trajectoiresIndividuelles(carnets, participants),
    participantCodes: participants.map((p) => p.code),
    presence: tauxPresenceParParticipant(seances, participants),
    manquantes: donneesManquantes({ participants, seances, carnets, suivis }),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Tableau de bord</h1>
        <div className="flex gap-2">
          {EXPORTS.map((e) => (
            <a
              key={e.table}
              href={`/api/export/${e.table}`}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Exporter {e.label}
            </a>
          ))}
          <a
            href="/api/export/pdf"
            className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
          >
            Exporter tout en PDF
          </a>
        </div>
      </div>

      <DashboardCharts {...data} />
    </div>
  );
}
