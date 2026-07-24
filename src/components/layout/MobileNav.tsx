"use client";

/**
 * MobileNav — SPEC §6 / §20.6.
 * Bottom tab bar below `lg`, mirroring the desktop sidebar.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav";
import { cn } from "@/lib/utils/cn";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-bg-card lg:hidden"
    >
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 text-caption transition-colors",
              active ? "text-primary-700" : "text-text-400",
            )}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path d={item.icon} fill="currentColor" />
            </svg>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
