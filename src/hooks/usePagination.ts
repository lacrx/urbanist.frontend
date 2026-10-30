import { useState, useMemo } from "react";

const PER_PAGE = 5;

export default function usePagination<T>(items: T[], perPage = PER_PAGE) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(items.length / perPage);

  const paginated = useMemo(
    () => items.slice((page - 1) * perPage, page * perPage),
    [items, page, perPage]
  );

  return {
    items: paginated,
    page,
    totalPages,
    total: items.length,
    setPage,
    hasPrev: page > 1,
    hasNext: page < totalPages,
    prev: () => setPage(p => Math.max(1, p - 1)),
    next: () => setPage(p => Math.min(totalPages, p + 1)),
  };
}
