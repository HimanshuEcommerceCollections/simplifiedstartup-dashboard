import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Pagination from "react-bootstrap/Pagination";
import Spinner from "react-bootstrap/Spinner";
import Table from "react-bootstrap/Table";
import { API_URL, api } from "../api/client";
import type { Paged, SubscriberDto } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import ConfirmModal from "../ui/ConfirmModal";
import { TableSkeleton } from "../ui/skeletons";
import { useToast } from "../ui/Toasts";

const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export default function Subscribers() {
  const { user } = useAuth();
  const canWrite = user?.role === "ADMIN" || user?.role === "EDITOR";
  const toast = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<SubscriberDto | null>(null);

  const params = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (q) params.set("q", q);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["subscribers", page, q],
    queryFn: () => api.get<Paged<SubscriberDto>>(`/admin/subscribers?${params}`),
    placeholderData: keepPreviousData,
  });

  const removeSubscriber = useMutation({
    mutationFn: (id: string) => api.del(`/admin/subscribers/${id}`),
    onSuccess: () => {
      toast("Subscriber removed.");
      setConfirmDelete(null);
      queryClient.invalidateQueries({ queryKey: ["subscribers"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: () => toast("Couldn't remove the subscriber.", "danger"),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-3">
        <div>
          <h1 className="fs-3 mb-0">Subscribers</h1>
          <span className="text-muted small">
            Newsletter signups from the site footer{isFetching && <Spinner size="sm" className="ms-2" />}
          </span>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Form.Control
            size="sm"
            style={{ width: 220 }}
            placeholder="Search email…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
          {canWrite && (
            <Button size="sm" variant="outline-primary" href={`${API_URL}/api/v1/admin/subscribers/export.csv`}>
              <i className="bi bi-download me-1" aria-hidden="true"></i>Export CSV
            </Button>
          )}
        </div>
      </div>

      <div className="card shadow-sm">
        <Table hover responsive className="mb-0 align-middle">
          <thead>
            <tr>
              <th>Email</th>
              <th>Signed up on</th>
              <th>Date</th>
              {canWrite && <th className="text-end">Actions</th>}
            </tr>
          </thead>
          {isLoading ? (
            <TableSkeleton rows={8} cols={canWrite ? 4 : 3} />
          ) : (
            <tbody>
              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-4">
                    No subscribers yet.
                  </td>
                </tr>
              )}
              {data?.items.map((sub) => (
                <tr key={sub.id}>
                  <td className="fw-semibold">{sub.email}</td>
                  <td className="text-muted">{sub.sourcePage ?? "—"}</td>
                  <td className="text-muted">{fmt(sub.createdAt)}</td>
                  {canWrite && (
                    <td className="text-end">
                      <Button size="sm" variant="outline-danger" onClick={() => setConfirmDelete(sub)} aria-label={`Remove ${sub.email}`}>
                        <i className="bi bi-trash" aria-hidden="true"></i>
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          )}
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination size="sm" className="mt-3">
          <Pagination.Prev disabled={page <= 1} onClick={() => setPage((p) => p - 1)} />
          <Pagination.Item active>{page}</Pagination.Item>
          <Pagination.Next disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} />
        </Pagination>
      )}

      <ConfirmModal
        show={!!confirmDelete}
        title="Remove this subscriber?"
        confirmLabel="Remove"
        busy={removeSubscriber.isPending}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && removeSubscriber.mutate(confirmDelete.id)}
      >
        <b>{confirmDelete?.email}</b> will be removed from the newsletter list.
      </ConfirmModal>
    </>
  );
}
