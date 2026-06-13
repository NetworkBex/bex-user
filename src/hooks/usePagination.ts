'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios, { type AxiosResponse } from 'axios';

const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZES = [10, 25, 50, 100] as const;
type PageSize = number;  // accept any positive integer; the dropdown constrains it

type PaginatedEnvelope<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

/**
 * Detect which envelope shape the backend returned.
 *   - Standard DRF:  { count, next, previous, results }
 *   - Legacy /affiliate/commissions: { count, page, per_page, results }
 *   - Bare array (no pagination declared): coerced into a 1-page envelope.
 */
function normalise<T>(data: any): PaginatedEnvelope<T> {
  if (Array.isArray(data)) {
    return { count: data.length, next: null, previous: null, results: data };
  }
  if (data && Array.isArray(data.results)) {
    return {
      count:    typeof data.count === 'number' ? data.count : data.results.length,
      next:     data.next     ?? null,
      previous: data.previous ?? null,
      results:  data.results,
    };
  }
  return { count: 0, next: null, previous: null, results: [] };
}

type Fetcher<T> = (params: { page: number; page_size: number }) => Promise<AxiosResponse<any>>;

type Options = {
  /** Initial page (default 1). */
  initialPage?: number;
  /** Initial page size (default 25). */
  initialPageSize?: PageSize;
  /** Other query params that should be included on every fetch. */
  extraParams?: Record<string, string | number | undefined | null>;
  /** Skip the initial fetch (use when you want to wait on something). */
  enabled?: boolean;
};

type PageSizeLiteral = (typeof PAGE_SIZES)[number];

type Result<T> = {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  loading: boolean;
  error: string | null;
  /** True when the next page is being fetched (in addition to `loading`). */
  fetching: boolean;
  setPage: (p: number) => void;
  setPageSize: (s: PageSize) => void;
  /** Force a re-fetch of the current page. */
  refresh: () => void;
  PAGE_SIZES: ReadonlyArray<PageSize>;
};

/**
 * Hook that wraps a list endpoint with full pagination state.
 *
 * The fetcher receives `{ page, page_size }` and is expected to return
 * an axios response whose ``.data`` is either a bare array, the standard
 * DRF envelope, or the legacy affiliate envelope. The hook normalises
 * them into a single shape.
 */
export function usePagination<T>(fetcher: Fetcher<T>, opts: Options = {}): Result<T> {
  const {
    initialPage = 1,
    initialPageSize = DEFAULT_PAGE_SIZE,
    extraParams = {},
    enabled = true,
  } = opts;

  const [page, setPageState]         = useState(initialPage);
  const [pageSize, setPageSizeState] = useState<PageSize>(initialPageSize);
  const [rows, setRows]             = useState<T[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // Latest extraParams without forcing a re-run when object identity changes
  // (callers commonly build a new object every render).
  const extraRef = useRef(extraParams);
  extraRef.current = extraParams;

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const doFetch = useCallback(async (p: number, ps: PageSize) => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { page: p, page_size: ps };
      for (const [k, v] of Object.entries(extraRef.current)) {
        if (v != null && v !== '') params[k] = v;
      }
      const res = await fetcherRef.current({ page: p, page_size: ps, ...params } as any);
      // Re-spread the params onto res.config.params (some callers
      // pre-bind params via a closure and ignore the argument).
      const data = (res as any).data?.data ?? (res as any).data;
      const env  = normalise<T>(data);
      setRows(env.results);
      setTotal(env.count);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? e?.message ?? 'Failed to load');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  // Fetch when page / pageSize / enabled / extraParams change.
  useEffect(() => { doFetch(page, pageSize); }, [doFetch, page, pageSize, JSON.stringify(extraParams)]);

  const setPage = useCallback((p: number) => {
    setPageState(Math.max(1, p));
  }, []);

  const setPageSize = useCallback((s: PageSize) => {
    setPageSizeState(s);
    setPageState(1); // reset to first page on size change
  }, []);

  const refresh = useCallback(() => { doFetch(page, pageSize); }, [doFetch, page, pageSize]);

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize],
  );

  return {
    rows,
    total,
    page,
    pageSize,
    pageCount,
    loading,
    error,
    fetching: loading,
    setPage,
    setPageSize,
    refresh,
    PAGE_SIZES: PAGE_SIZES as unknown as ReadonlyArray<PageSize>,
  };
}

export { PAGE_SIZES };
export type { PageSize, Fetcher };
