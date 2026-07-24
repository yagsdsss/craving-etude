import OutilsP07 from "@/components/admin/OutilsP07";

export const dynamic = "force-dynamic";

export default function OutilsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Outils</h1>
        <p className="mt-1 text-sm text-slate-500">
          Actions ponctuelles sur les données. Chaque bouton met à jour la base directement.
        </p>
      </div>
      <OutilsP07 />
    </div>
  );
}
