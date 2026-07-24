import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class strings, resolving conflicts (last wins).
 * Used by every ui/ primitive so callers can override any class.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
