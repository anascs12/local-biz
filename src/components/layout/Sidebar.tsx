"use client";

/**
 * Sidebar — SPEC §6 navigation rule / §20.6.
 * Persistent left sidebar on desktop; collapses to a bottom tab bar below `lg`.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav";
import { cn } from "@/lib/utils/cn";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-bg-card lg:flex lg:flex-col">
      <div className="flex h-16 items-center px-6">
        <Link href="/" className="text-h3 text-text-900">
          LocalBiz<span className="text-primary-600"> AI</span>
        </Link>
      </div>
      <nav className="flex flex-col gap-1 px-3 py-2" aria-label="Main">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-small transition-colors",
                active
                  ? "bg-primary-50 font-medium text-primary-700"
                  : "text-text-600 hover:bg-primary-50 hover:text-text-900",
              )}
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
                <path d={item.icon} fill="currentColor" />
              </svg>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
