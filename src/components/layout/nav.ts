/**
 * Navigation config — SPEC §8.
 *
 * Only routes that ACTUALLY EXIST are listed. Entries are added as each page is
 * built, so the shell never shows a dead link or "coming soon" placeholder
 * (§34: "No TODO or placeholder text visible in the UI").
 */

export interface NavItem {
  href: string;
  label: string;
  /** Inline SVG path data (24x24 viewBox, stroke-based). */
  icon: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  },
  {
    href: "/analytics",
    label: "Analytics",
    icon: "M4 20h16v-2H4v2zm2-4h2V9H6v7zm4 0h2V4h-2v12zm4 0h2v-5h-2v5zm4 0h2V7h-2v9z",
  },
  {
    href: "/products",
    label: "Products",
    icon: "M12 2l9 4.5v11L12 22l-9-4.5v-11L12 2zm0 2.2L5.5 7.5 12 10.8l6.5-3.3L12 4.2zM5 9.3v7l6 3v-7l-6-3zm14 0l-6 3v7l6-3v-7z",
  },
  {
    href: "/categories",
    label: "Categories",
    icon: "M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z",
  },
  {
    href: "/analyst",
    label: "AI Analyst",
    icon: "M12 2l2.4 5.6L20 10l-5.6 2.4L12 18l-2.4-5.6L4 10l5.6-2.4L12 2zm6.5 11l1.1 2.4 2.4 1.1-2.4 1.1-1.1 2.4-1.1-2.4L15 16.5l2.4-1.1L18.5 13z",
  },
  {
    href: "/report",
    label: "AI Report",
    icon: "M6 2h9l5 5v15H6V2zm8 1.5V8h4.5L14 3.5zM8 12h8v1.5H8V12zm0 3.5h8V17H8v-1.5zM8 8.5h4V10H8V8.5z",
  },
  {
    href: "/upload",
    label: "Upload data",
    icon: "M12 3l5.5 5.5h-3.5V15h-4V8.5H6.5L12 3zM5 18h14v2.5H5V18z",
  },
];
