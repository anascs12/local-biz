import type { Transaction } from "./transaction";
import type { ValidationIssue } from "./validation";

/**
 * Assembled dataset held in React context for the session — SPEC §10.2.
 * No server persistence (§21.2); snapshotted to sessionStorage only.
 */
export interface Dataset {
  /** File name, or "Urban Threads PK (Demo)". */
  name: string;
  isDemo: boolean;
  transactions: Transaction[];
  /** true when >= 80% of rows have a valid, non-zero cost (§10.3 threshold). */
  hasCostData: boolean;
  hasOrderIds: boolean;
  hasCategories: boolean;
  dateRange: { start: Date; end: Date };
  validRowCount: number;
  skippedRowCount: number;
  issues: ValidationIssue[];
}
