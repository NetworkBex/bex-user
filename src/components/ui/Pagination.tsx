'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/ui';

type Props = {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  pageSizes?: ReadonlyArray<number>;
  onPageChange: (p: number) => void;
  onPageSizeChange?: (n: number) => void;
  loading?: boolean;
  className?: string;
  /** Optional item-name for the "showing X–Y of Z items" caption. */
  itemLabel?: string;
};

/**
 * Pagination footer for list views. Renders a compact
 * "Showing N–M of K items" caption, a page-size dropdown, and a smart
 * windowed pager (first, prev, current ± 1, next, last).
 *
 * Stateless — the parent owns page + pageSize state via `usePagination`.
 */
export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  pageSizes = [10, 25, 50, 100],
  onPageChange,
  onPageSizeChange,
  loading = false,
  className,
  itemLabel = 'items',
}: Props) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end   = Math.min(total, page * pageSize);

  // Windowed page buttons — show first, last, current ± 1, and the
  // immediate neighbours. Hide ellipses on tiny ranges.
  const pages = useMemo(() => {
    if (pageCount <= 7) {
      return Array.from({ length: pageCount }, (_, i) => i + 1);
    }
    const set = new Set<number>([
      1, pageCount,
      page - 1, page, page + 1,
    ]);
    return Array.from(set).filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
  }, [page, pageCount]);

  const goto = (p: number) => {
    if (p < 1 || p > pageCount || p === page || loading) return;
    onPageChange(p);
  };

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-3 border-t border-hairline',
        'text-[12px] text-fg-muted',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span className="tabular">
          {total === 0
            ? `0 ${itemLabel}`
            : `Showing ${start.toLocaleString()}–${end.toLocaleString()} of ${total.toLocaleString()} ${itemLabel}`}
        </span>
        {onPageSizeChange && (
          <label className="inline-flex items-center gap-1.5">
            <span>Per page</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              disabled={loading}
              className="h-7 px-2 rounded-md border border-border bg-surface-2 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50"
            >
              {pageSizes.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="inline-flex items-center gap-1">
        <PageBtn label="First" disabled={page === 1 || loading} onClick={() => goto(1)}>
          <ChevronsLeft className="size-3.5" />
        </PageBtn>
        <PageBtn label="Previous" disabled={page === 1 || loading} onClick={() => goto(page - 1)}>
          <ChevronLeft className="size-3.5" />
        </PageBtn>

        {pages.map((p, i) => {
          const prev = pages[i - 1];
          const gap  = prev != null && p - prev > 1;
          return (
            <span key={p} className="inline-flex items-center gap-1">
              {gap && <span className="px-1 text-fg-subtle">…</span>}
              <button
                type="button"
                onClick={() => goto(p)}
                aria-current={p === page ? 'page' : undefined}
                disabled={loading}
                className={cn(
                  'h-7 min-w-7 px-2 rounded-md text-[12px] font-semibold tabular transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]',
                  'disabled:opacity-60',
                  p === page
                    ? 'bg-fg text-fg-inverse'
                    : 'text-fg-muted hover:text-fg hover:bg-surface-2',
                )}
              >
                {p}
              </button>
            </span>
          );
        })}

        <PageBtn label="Next" disabled={page === pageCount || loading} onClick={() => goto(page + 1)}>
          <ChevronRight className="size-3.5" />
        </PageBtn>
        <PageBtn label="Last" disabled={page === pageCount || loading} onClick={() => goto(pageCount)}>
          <ChevronsRight className="size-3.5" />
        </PageBtn>
      </div>
    </div>
  );
}

function PageBtn({
  children, label, disabled, onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'inline-flex items-center justify-center size-7 rounded-md text-fg-muted',
        'hover:text-fg hover:bg-surface-2',
        'disabled:opacity-50 disabled:hover:bg-transparent disabled:cursor-not-allowed',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]',
      )}
    >
      {children}
    </button>
  );
}
