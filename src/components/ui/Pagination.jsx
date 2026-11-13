import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cx } from '@/utils/format';

export function usePagination(items, pageSize = 10, resetKey) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);

  const pageItems = useMemo(() => items.slice((page - 1) * pageSize, page * pageSize), [items, page, pageSize]);
  return { page, pages, setPage, pageItems, total: items.length, pageSize };
}

export default function Pagination({ page, pages, setPage, total, pageSize }) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  const nums = [];
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  for (let i = start; i <= Math.min(pages, start + 4); i++) nums.push(i);

  return (
    <div className="table-footer">
      <span>
        Showing <strong>{from}</strong>–<strong>{to}</strong> of <strong>{total}</strong>
      </span>
      <div className="pagination">
        <button type="button" onClick={() => setPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft size={15} />
        </button>
        {nums.map((n) => (
          <button key={n} type="button" className={cx(n === page && 'is-active')} onClick={() => setPage(n)}>
            {n}
          </button>
        ))}
        <button type="button" onClick={() => setPage(page + 1)} disabled={page >= pages} aria-label="Next page">
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
