import { pagination, label } from "./pagination.module.css";

type PaginationProps = {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
};

export default function Pagination({ page, totalPages, onPrev, onNext }: PaginationProps) {
  if (totalPages <= 1) return null;

  const handleClick = (action: () => void) => (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    action();
  };

  return (
    <nav className={pagination} aria-label="Pagination">
      <button onClick={handleClick(onPrev)} disabled={page <= 1} aria-label="Previous page">
        ‹ Prev
      </button>
      <span className={label}>{page} of {totalPages}</span>
      <button onClick={handleClick(onNext)} disabled={page >= totalPages} aria-label="Next page">
        Next ›
      </button>
    </nav>
  );
}
