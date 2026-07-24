import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Table primitives — SPEC §20.5
 * Sticky header, 44px rows, zebra OFF, hover tint `primary-50`, numeric columns
 * right-aligned with tabular figures, sortable headers with a chevron.
 * §20.6: wide tables scroll horizontally inside a bordered container with a
 * right-edge fade affordance.
 */

export type SortDirection = "asc" | "desc" | null;

/** Scroll container + <table>. Wraps children in a bordered, horizontally scrollable box. */
export interface TableProps
  extends React.TableHTMLAttributes<HTMLTableElement> {
  /** Wrap in the bordered scroll container with a right-edge fade (default true). */
  contained?: boolean;
  containerClassName?: string;
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, contained = true, containerClassName, ...props }, ref) => {
    const table = (
      <table
        ref={ref}
        className={cn("w-full border-collapse text-small", className)}
        {...props}
      />
    );
    if (!contained) return table;
    return (
      <div className={cn("relative", containerClassName)}>
        <div className="overflow-x-auto rounded-lg border border-border">
          {table}
        </div>
        {/* right-edge fade affordance (§20.6) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-8 rounded-r-lg bg-gradient-to-l from-bg-card to-transparent lg:hidden"
        />
      </div>
    );
  },
);
Table.displayName = "Table";

export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      "sticky top-0 z-10 bg-bg-card [&_th]:border-b [&_th]:border-border",
      className,
    )}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr]:border-b [&_tr:last-child]:border-0", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

export const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-border transition-colors hover:bg-primary-50",
      className,
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

export interface TableHeadProps
  extends React.ThHTMLAttributes<HTMLTableCellElement> {
  /** Right-align + tabular numerals for numeric columns. */
  numeric?: boolean;
  /** Make the header a sort control; supply `sort` + `onSort`. */
  sortable?: boolean;
  sort?: SortDirection;
  onSort?: () => void;
}

function SortChevron({ direction }: { direction: SortDirection }) {
  return (
    <span className="ml-1 inline-flex flex-col leading-none">
      <svg
        className={cn(
          "h-[7px] w-[9px]",
          direction === "asc" ? "text-primary-600" : "text-text-400/50",
        )}
        viewBox="0 0 10 7"
        fill="none"
        aria-hidden="true"
      >
        <path d="M5 0l4 6H1z" fill="currentColor" />
      </svg>
      <svg
        className={cn(
          "h-[7px] w-[9px]",
          direction === "desc" ? "text-primary-600" : "text-text-400/50",
        )}
        viewBox="0 0 10 7"
        fill="none"
        aria-hidden="true"
      >
        <path d="M5 7L1 1h8z" fill="currentColor" />
      </svg>
    </span>
  );
}

export const TableHead = React.forwardRef<
  HTMLTableCellElement,
  TableHeadProps
>(
  (
    { className, numeric, sortable, sort = null, onSort, children, ...props },
    ref,
  ) => (
    <th
      ref={ref}
      scope="col"
      aria-sort={
        sortable
          ? sort === "asc"
            ? "ascending"
            : sort === "desc"
              ? "descending"
              : "none"
          : undefined
      }
      className={cn(
        "h-11 px-4 align-middle text-small font-medium text-text-600",
        numeric ? "text-right" : "text-left",
        className,
      )}
      {...props}
    >
      {sortable ? (
        <button
          type="button"
          onClick={onSort}
          className={cn(
            "inline-flex items-center rounded-sm hover:text-text-900",
            numeric && "flex-row-reverse",
          )}
        >
          {children}
          <SortChevron direction={sort} />
        </button>
      ) : (
        children
      )}
    </th>
  ),
);
TableHead.displayName = "TableHead";

export interface TableCellProps
  extends React.TdHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
}

export const TableCell = React.forwardRef<
  HTMLTableCellElement,
  TableCellProps
>(({ className, numeric, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "h-11 px-4 align-middle text-small text-text-900",
      numeric && "nums text-right",
      className,
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";
