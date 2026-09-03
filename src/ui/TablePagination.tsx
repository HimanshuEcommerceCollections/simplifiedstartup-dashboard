import { useState } from "react";
import Form from "react-bootstrap/Form";
import Pagination from "react-bootstrap/Pagination";

export const PAGE_SIZE_OPTIONS = [10, 20, 50];

type TablePaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
  sizeOptions?: number[];
};

/** The house table footer: row range, rows-per-page select, and back/next. */
export default function TablePagination({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
  sizeOptions = PAGE_SIZE_OPTIONS,
}: TablePaginationProps) {
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
      <span className="text-muted small">
        Showing {from}–{to} of {total}
      </span>
      <div className="d-flex align-items-center gap-2">
        <Form.Select
          size="sm"
          style={{ width: 110 }}
          value={pageSize}
          aria-label="Rows per page"
          onChange={(e) => onPageSize(Number(e.target.value))}
        >
          {sizeOptions.map((s) => (
            <option key={s} value={s}>
              {s} / page
            </option>
          ))}
        </Form.Select>
        <Pagination size="sm" className="mb-0">
          <Pagination.Prev disabled={page <= 1} onClick={() => onPage(page - 1)} />
          <Pagination.Item active>{page}</Pagination.Item>
          <Pagination.Item disabled>of {maxPage}</Pagination.Item>
          <Pagination.Next disabled={page >= maxPage} onClick={() => onPage(page + 1)} />
        </Pagination>
      </div>
    </div>
  );
}

/** Client-side pagination over an in-memory list (content tabs, team, postings). */
export function useClientPagination<T>(items: T[], initialSize = 20) {
  const [rawPage, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialSize);
  const maxPage = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(rawPage, maxPage); // clamps when the list shrinks (filters/search)
  const startIndex = (page - 1) * pageSize;
  return {
    page,
    setPage,
    pageSize,
    setPageSize: (size: number) => {
      setPageSizeState(size);
      setPage(1);
    },
    total: items.length,
    pageItems: items.slice(startIndex, startIndex + pageSize),
    startIndex,
  };
}
