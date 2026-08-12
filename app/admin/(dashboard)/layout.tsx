import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import { isAdminAuthDisabled } from "@/lib/auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      {isAdminAuthDisabled() && (
        <div className="bg-red-600 px-6 py-2 text-center text-sm font-medium text-white">
          ⚠️ Accès admin sans mot de passe (ADMIN_AUTH_DISABLED). N&apos;importe qui ayant
          l&apos;adresse peut voir et modifier les données — à réactiver après la démonstration.
        </div>
      )}
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <span className="text-sm font-semibold text-slate-900">Étude craving</span>
            <Link href="/admin" className="text-sm text-slate-600 hover:text-slate-900">
              Tableau de bord
            </Link>
            <Link href="/admin/participants" className="text-sm text-slate-600 hover:text-slate-900">
              Participants
            </Link>
            <Link href="/admin/donnees" className="text-sm text-slate-600 hover:text-slate-900">
              Données
            </Link>
            <Link href="/admin/outils" className="text-sm text-slate-600 hover:text-slate-900">
              Outils
            </Link>
          </div>
          <LogoutButton />
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
