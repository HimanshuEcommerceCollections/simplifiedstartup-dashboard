import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import Spinner from "react-bootstrap/Spinner";
import Table from "react-bootstrap/Table";
import TablePagination from "../ui/TablePagination";
import { api } from "../api/client";
import { LEAD_STATUSES, type LeadDto, type LeadStatus, type Paged } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import ConfirmModal from "../ui/ConfirmModal";
import { TableSkeleton } from "../ui/skeletons";
import { useToast } from "../ui/Toasts";

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: "primary",
  contacted: "info",
  booked: "warning",
  won: "success",
  lost: "secondary",
};

const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export default function Leads() {
  const { user } = useAuth();
  const canWrite = user?.role === "ADMIN" || user?.role === "EDITOR";
  const toast = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | LeadStatus>("");
  const [selected, setSelected] = useState<LeadDto | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<LeadDto | null>(null);

  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (q) query.set("q", q);
  if (status) query.set("status", status);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["leads", page, pageSize, q, status],
    queryFn: () => api.get<Paged<LeadDto>>(`/admin/leads?${query}`),
    placeholderData: keepPreviousData,
  });

  const removeLead = useMutation({
    mutationFn: (id: string) => api.del(`/admin/leads/${id}`),
    onSuccess: () => {
      toast("Lead deleted.");
      setConfirmDelete(null);
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: () => toast("Couldn't delete the lead.", "danger"),
  });

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-3">
        <div>
          <h1 className="fs-3 mb-0">Leads</h1>
          <span className="text-muted small">Growth-plan requests from the website{isFetching && <Spinner size="sm" className="ms-2" />}</span>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Form.Select
            size="sm"
            style={{ width: 160 }}
            value={status}
            aria-label="Filter by status"
            onChange={(e) => {
              setStatus(e.target.value as "" | LeadStatus);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Form.Select>
          <Form.Control
            size="sm"
            style={{ width: 220 }}
            placeholder="Search name, email, business…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className="card shadow-sm">
        <Table striped hover responsive className="mb-0 align-middle table-hover">
          <thead>
            <tr>
              <th style={{ width: 64 }}>S.No.</th>
              <th>Name</th>
              <th>Email</th>
              <th>Needs</th>
              <th>Status</th>
              <th>Received</th>
            </tr>
          </thead>
          {isLoading ? (
            <TableSkeleton rows={8} cols={6} />
          ) : (
            <tbody>
              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4">
                    No leads match.
                  </td>
                </tr>
              )}
              {data?.items.map((lead, i) => (
                <tr key={lead.id} onClick={() => setSelected(lead)}>
                  <td className="text-muted">{(page - 1) * pageSize + i + 1}</td>
                  <td className="fw-semibold">{lead.name}</td>
                  <td>{lead.email}</td>
                  <td className="text-truncate" style={{ maxWidth: 220 }}>
                    {lead.need}
                  </td>
                  <td>
                    <Badge bg={STATUS_COLORS[lead.status]}>{lead.status}</Badge>
                  </td>
                  <td className="text-muted">{fmt(lead.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          )}
        </Table>
      </div>

      <TablePagination page={page} pageSize={pageSize} total={data?.total ?? 0} onPage={setPage} onPageSize={(s) => { setPageSize(s); setPage(1); }} />

      {selected && (
        <LeadModal
          lead={selected}
          canWrite={canWrite}
          onClose={() => setSelected(null)}
          onDelete={() => setConfirmDelete(selected)}
        />
      )}

      <ConfirmModal
        show={!!confirmDelete}
        title="Delete this lead?"
        confirmLabel="Delete lead"
        busy={removeLead.isPending}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && removeLead.mutate(confirmDelete.id)}
      >
        <b>{confirmDelete?.name}</b> ({confirmDelete?.email}) will be permanently removed. This can&apos;t be undone.
      </ConfirmModal>
    </>
  );
}

function LeadModal({
  lead,
  canWrite,
  onClose,
  onDelete,
}: {
  lead: LeadDto;
  canWrite: boolean;
  onClose: () => void;
  onDelete: () => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [notes, setNotes] = useState(lead.notes ?? "");
  const dirty = status !== lead.status || notes !== (lead.notes ?? "");

  const save = useMutation({
    mutationFn: () => api.patch(`/admin/leads/${lead.id}`, { status, notes }),
    onSuccess: () => {
      toast("Lead updated.");
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      onClose();
    },
    onError: () => toast("Couldn't save the lead.", "danger"),
  });

  const row = (k: string, v: string | null) => (
    <div className="mb-2">
      <div className="text-muted small text-uppercase">{k}</div>
      <div>{v || "—"}</div>
    </div>
  );

  return (
    <Modal show onHide={onClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title className="fs-5">
          {lead.name} <span className="text-muted fw-normal fs-6">· {fmt(lead.createdAt)}</span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="row">
          <div className="col-md-6">
            {row("Email", lead.email)}
            {row("Business", lead.business)}
            {row("Stage", lead.stage)}
            {row("Needs", lead.need)}
          </div>
          <div className="col-md-6">{row("Message", lead.message)}</div>
        </div>
        <hr />
        <div className="row g-3">
          <div className="col-md-4">
            <Form.Label className="small text-muted text-uppercase">Status</Form.Label>
            <Form.Select value={status} disabled={!canWrite} onChange={(e) => setStatus(e.target.value as LeadStatus)}>
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Form.Select>
          </div>
          <div className="col-md-8">
            <Form.Label className="small text-muted text-uppercase">Notes</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={notes}
              disabled={!canWrite}
              placeholder="Call outcomes, next steps…"
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer className="justify-content-between">
        {canWrite ? (
          <Button variant="outline-danger" onClick={onDelete}>
            <i className="bi bi-trash me-1" aria-hidden="true"></i>Delete
          </Button>
        ) : (
          <span className="text-muted small">Read-only access</span>
        )}
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" onClick={onClose}>
            Close
          </Button>
          {canWrite && (
            <Button onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
              {save.isPending && <Spinner size="sm" className="me-2" />}
              Save changes
            </Button>
          )}
        </div>
      </Modal.Footer>
    </Modal>
  );
}
