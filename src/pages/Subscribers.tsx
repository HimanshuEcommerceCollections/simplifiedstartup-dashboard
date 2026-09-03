import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Spinner from "react-bootstrap/Spinner";
import Table from "react-bootstrap/Table";
import TablePagination from "../ui/TablePagination";
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
  const [pageSize, setPageSize] = useState(20);
  const [q, setQ] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<SubscriberDto | null>(null);

  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (q) params.set("q", q);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["subscribers", page, pageSize, q],
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
        <Table striped hover responsive className="mb-0 align-middle">
          <thead>
            <tr>
              <th style={{ width: 64 }}>S.No.</th>
              <th>Email</th>
              <th>Signed up on</th>
              <th>Date</th>
              {canWrite && <th className="text-end">Actions</th>}
            </tr>
          </thead>
          {isLoading ? (
            <TableSkeleton rows={8} cols={canWrite ? 5 : 4} />
          ) : (
            <tbody>
              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">
                    No subscribers yet.
                  </td>
                </tr>
              )}
              {data?.items.map((sub, i) => (
                <tr key={sub.id}>
                  <td className="text-muted">{(page - 1) * pageSize + i + 1}</td>
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

      <TablePagination page={page} pageSize={pageSize} total={data?.total ?? 0} onPage={setPage} onPageSize={(s) => { setPageSize(s); setPage(1); }} />

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
