/**
 * AppLayout — SPEC §8 / §6 navigation rule.
 * Shared chrome for every data route: sidebar (desktop) / bottom tab bar
 * (mobile), plus a header that always names the active dataset.
 *
 * The RequireDataset guard is applied per page rather than here, because
 * /upload must remain reachable precisely when there is no dataset.
 */

import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Sidebar } from "@/components/layout/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-bg-app">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        {/* pb-16 keeps content clear of the mobile tab bar */}
        <main className="flex-1 pb-16 lg:pb-0">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
