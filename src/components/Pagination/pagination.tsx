import { pagination, label } from "./pagination.module.css";

type PaginationProps = {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
};

export default function Pagination({ page, totalPages, onPrev, onNext }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <nav className={pagination} aria-label="Pagination">
      <button onClick={onPrev} disabled={page <= 1} aria-label="Previous page">
        ‹ Prev
      </button>
      <span className={label}>{page} of {totalPages}</span>
      <button onClick={onNext} disabled={page >= totalPages} aria-label="Next page">
        Next ›
      </button>
    </nav>
  );
}
