import { useState, type FormEvent } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import Pagination from "react-bootstrap/Pagination";
import Spinner from "react-bootstrap/Spinner";
import Tab from "react-bootstrap/Tab";
import Table from "react-bootstrap/Table";
import Tabs from "react-bootstrap/Tabs";
import { API_URL, api, ApiError } from "../api/client";
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
  type CareerRoleDto,
  type JobApplicationDto,
  type Paged,
  type PublishStatusDto,
} from "../api/types";
import ConfirmModal from "../ui/ConfirmModal";
import { TableSkeleton } from "../ui/skeletons";
import { useToast } from "../ui/Toasts";

const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const APP_STATUS_COLORS: Record<ApplicationStatus, string> = {
  new: "primary",
  reviewed: "info",
  shortlisted: "warning",
  hired: "success",
  rejected: "secondary",
};

export default function Careers() {
  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-3">
        <div>
          <h1 className="fs-3 mb-0">Careers</h1>
          <span className="text-muted small">Job postings on the website, and the applications they bring in.</span>
        </div>
        <PublishButton />
      </div>
      <Tabs defaultActiveKey="postings" className="mb-3">
        <Tab eventKey="postings" title="Job postings">
          <PostingsTab />
        </Tab>
        <Tab eventKey="applications" title="Applications">
          <ApplicationsTab />
        </Tab>
      </Tabs>
    </>
  );
}

/* ---------------- publish to website ---------------- */

function PublishButton() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const { data } = useQuery({
    queryKey: ["publish-status"],
    queryFn: () => api.get<{ status: PublishStatusDto }>("/admin/publish"),
  });

  const publish = useMutation({
    mutationFn: () => api.post<{ hookConfigured: boolean }>("/admin/publish"),
    onSuccess: (res) => {
      toast(res.hookConfigured ? "Website rebuild triggered." : "Publish recorded — no deploy hook configured yet.");
      setConfirm(false);
      queryClient.invalidateQueries({ queryKey: ["publish-status"] });
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : "Publish failed.", "danger"),
  });

  const status = data?.status;
  return (
    <div className="text-end">
      <Button variant="success" onClick={() => setConfirm(true)}>
        <i className="bi bi-rocket-takeoff me-1" aria-hidden="true"></i>Publish to website
      </Button>
      {status?.lastPublishedAt && (
        <div className="text-muted small mt-1">
          Last published {fmtTime(status.lastPublishedAt)}
          {status.lastPublishedBy ? ` by ${status.lastPublishedBy}` : ""}
        </div>
      )}
      <ConfirmModal
        show={confirm}
        title="Publish to the website?"
        confirmLabel="Publish"
        variant="primary"
        busy={publish.isPending}
        onCancel={() => setConfirm(false)}
        onConfirm={() => publish.mutate()}
      >
        The live website rebuilds with the currently <b>published</b> postings.
        {!status?.hookConfigured && (
          <div className="alert alert-warning py-2 mt-2 mb-0 small">
            No deploy hook is configured on the server yet (<code>WEBSITE_DEPLOY_HOOK_URL</code>) — this will only record the
            publish.
          </div>
        )}
      </ConfirmModal>
    </div>
  );
}

/* ---------------- postings ---------------- */

type RoleDraft = { title: string; type: string; location: string; description: string; published: boolean; sortOrder: number };
const EMPTY_DRAFT: RoleDraft = { title: "", type: "Full-time", location: "Remote", description: "", published: true, sortOrder: 0 };

function PostingsTab() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<{ id?: string; draft: RoleDraft } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CareerRoleDto | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["career-roles"],
    queryFn: () => api.get<{ items: CareerRoleDto[] }>("/admin/career-roles"),
  });

  const refetch = () => queryClient.invalidateQueries({ queryKey: ["career-roles"] });

  const save = useMutation({
    mutationFn: ({ id, draft }: { id?: string; draft: RoleDraft }) =>
      id ? api.patch(`/admin/career-roles/${id}`, draft) : api.post("/admin/career-roles", draft),
    onSuccess: (_res, { id }) => {
      toast(id ? "Posting updated." : "Posting created.");
      setEditing(null);
      refetch();
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : "Couldn't save the posting.", "danger"),
  });

  const togglePublished = useMutation({
    mutationFn: (role: CareerRoleDto) => api.patch(`/admin/career-roles/${role.id}`, { published: !role.published }),
    onSuccess: (_res, role) => {
      toast(role.published ? "Posting unpublished." : "Posting published.");
      refetch();
    },
    onError: () => toast("Couldn't update the posting.", "danger"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/admin/career-roles/${id}`),
    onSuccess: () => {
      toast("Posting deleted — its applications remain as general applications.");
      setConfirmDelete(null);
      refetch();
    },
    onError: () => toast("Couldn't delete the posting.", "danger"),
  });

  return (
    <>
      <div className="d-flex justify-content-end mb-2">
        <Button size="sm" onClick={() => setEditing({ draft: { ...EMPTY_DRAFT, sortOrder: data?.items.length ?? 0 } })}>
          <i className="bi bi-plus-lg me-1" aria-hidden="true"></i>New posting
        </Button>
      </div>
      <div className="card shadow-sm">
        <Table hover responsive className="mb-0 align-middle">
          <thead>
            <tr>
              <th>Role</th>
              <th>Type</th>
              <th>Location</th>
              <th>Visibility</th>
              <th>Applications</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          {isLoading ? (
            <TableSkeleton rows={5} cols={6} />
          ) : (
            <tbody>
              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4">
                    No postings yet — create the first one.
                  </td>
                </tr>
              )}
              {data?.items.map((role) => (
                <tr key={role.id}>
                  <td>
                    <div className="fw-semibold">{role.title}</div>
                    <div className="text-muted small text-truncate" style={{ maxWidth: 320 }}>
                      {role.description}
                    </div>
                  </td>
                  <td>{role.type}</td>
                  <td className="text-muted">{role.location ?? "—"}</td>
                  <td>
                    <Form.Check
                      type="switch"
                      id={`pub-${role.id}`}
                      checked={role.published}
                      onChange={() => togglePublished.mutate(role)}
                      label={<Badge bg={role.published ? "success" : "secondary"}>{role.published ? "published" : "hidden"}</Badge>}
                    />
                  </td>
                  <td>{role.applicationCount ?? 0}</td>
                  <td className="text-end">
                    <div className="d-inline-flex gap-1">
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        onClick={() =>
                          setEditing({
                            id: role.id,
                            draft: {
                              title: role.title,
                              type: role.type,
                              location: role.location ?? "",
                              description: role.description,
                              published: role.published,
                              sortOrder: role.sortOrder,
                            },
                          })
                        }
                      >
                        <i className="bi bi-pencil" aria-hidden="true"></i>
                      </Button>
                      <Button size="sm" variant="outline-danger" onClick={() => setConfirmDelete(role)}>
                        <i className="bi bi-trash" aria-hidden="true"></i>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          )}
        </Table>
      </div>

      {editing && (
        <RoleModal
          initial={editing.draft}
          isNew={!editing.id}
          busy={save.isPending}
          onCancel={() => setEditing(null)}
          onSave={(draft) => save.mutate({ id: editing.id, draft })}
        />
      )}

      <ConfirmModal
        show={!!confirmDelete}
        title="Delete this posting?"
        confirmLabel="Delete posting"
        busy={remove.isPending}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && remove.mutate(confirmDelete.id)}
      >
        <b>{confirmDelete?.title}</b> disappears from the website on the next publish. Its{" "}
        {confirmDelete?.applicationCount ?? 0} application(s) stay in the inbox as general applications.
      </ConfirmModal>
    </>
  );
}

function RoleModal({
  initial,
  isNew,
  busy,
  onCancel,
  onSave,
}: {
  initial: RoleDraft;
  isNew: boolean;
  busy: boolean;
  onCancel: () => void;
  onSave: (draft: RoleDraft) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const set = <K extends keyof RoleDraft>(key: K, value: RoleDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    onSave(draft);
  }

  return (
    <Modal show onHide={busy ? undefined : onCancel} centered size="lg">
      <Form onSubmit={onSubmit}>
        <Modal.Header closeButton={!busy}>
          <Modal.Title className="fs-5">{isNew ? "New job posting" : "Edit job posting"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="row g-3">
            <div className="col-md-6">
              <Form.Label>Title</Form.Label>
              <Form.Control value={draft.title} onChange={(e) => set("title", e.target.value)} required autoFocus placeholder="Growth Marketer" />
            </div>
            <div className="col-md-3">
              <Form.Label>Type</Form.Label>
              <Form.Control value={draft.type} onChange={(e) => set("type", e.target.value)} required placeholder="Full-time" />
            </div>
            <div className="col-md-3">
              <Form.Label>Location</Form.Label>
              <Form.Control value={draft.location} onChange={(e) => set("location", e.target.value)} placeholder="Remote" />
            </div>
            <div className="col-12">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={draft.description}
                onChange={(e) => set("description", e.target.value)}
                required
                placeholder="One or two sentences shown on the careers page."
              />
            </div>
            <div className="col-md-6 d-flex align-items-center">
              <Form.Check
                type="switch"
                id="draft-published"
                checked={draft.published}
                onChange={(e) => set("published", e.target.checked)}
                label="Visible on the website (after publish)"
              />
            </div>
            <div className="col-md-3">
              <Form.Label>Sort order</Form.Label>
              <Form.Control
                type="number"
                min={0}
                value={draft.sortOrder}
                onChange={(e) => set("sortOrder", Number(e.target.value) || 0)}
              />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !draft.title || !draft.description}>
            {busy && <Spinner size="sm" className="me-2" />}
            {isNew ? "Create posting" : "Save changes"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

/* ---------------- applications ---------------- */

function ApplicationsTab() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"" | ApplicationStatus>("");
  const [selected, setSelected] = useState<JobApplicationDto | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<JobApplicationDto | null>(null);

  const params = new URLSearchParams({ page: String(page), pageSize: "15" });
  if (status) params.set("status", status);

  const { data, isLoading } = useQuery({
    queryKey: ["applications", page, status],
    queryFn: () => api.get<Paged<JobApplicationDto>>(`/admin/applications?${params}`),
    placeholderData: keepPreviousData,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/admin/applications/${id}`),
    onSuccess: () => {
      toast("Application deleted (CV file included).");
      setConfirmDelete(null);
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: () => toast("Couldn't delete the application.", "danger"),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <div className="d-flex justify-content-end mb-2">
        <Form.Select
          size="sm"
          style={{ width: 170 }}
          value={status}
          aria-label="Filter by status"
          onChange={(e) => {
            setStatus(e.target.value as "" | ApplicationStatus);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {APPLICATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Form.Select>
      </div>
      <div className="card shadow-sm">
        <Table hover responsive className="mb-0 align-middle table-hover">
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Role</th>
              <th>CV</th>
              <th>Status</th>
              <th>Received</th>
            </tr>
          </thead>
          {isLoading ? (
            <TableSkeleton rows={6} cols={5} />
          ) : (
            <tbody>
              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">
                    No applications{status ? " with this status" : " yet"}.
                  </td>
                </tr>
              )}
              {data?.items.map((a) => (
                <tr key={a.id} onClick={() => setSelected(a)}>
                  <td>
                    <div className="fw-semibold">{a.name}</div>
                    <div className="text-muted small">{a.email}</div>
                  </td>
                  <td>{a.roleTitle ?? <span className="text-muted">General</span>}</td>
                  <td>{a.hasCv ? <i className="bi bi-file-earmark-check text-success" aria-label="CV attached"></i> : <span className="text-muted">—</span>}</td>
                  <td>
                    <Badge bg={APP_STATUS_COLORS[a.status]}>{a.status}</Badge>
                  </td>
                  <td className="text-muted">{fmt(a.createdAt)}</td>
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

      {selected && (
        <ApplicationModal application={selected} onClose={() => setSelected(null)} onDelete={() => setConfirmDelete(selected)} />
      )}

      <ConfirmModal
        show={!!confirmDelete}
        title="Delete this application?"
        confirmLabel="Delete application"
        busy={remove.isPending}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && remove.mutate(confirmDelete.id)}
      >
        <b>{confirmDelete?.name}</b>&apos;s application and its CV file will be permanently removed.
      </ConfirmModal>
    </>
  );
}

function ApplicationModal({
  application,
  onClose,
  onDelete,
}: {
  application: JobApplicationDto;
  onClose: () => void;
  onDelete: () => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ApplicationStatus>(application.status);

  const save = useMutation({
    mutationFn: () => api.patch(`/admin/applications/${application.id}`, { status }),
    onSuccess: () => {
      toast("Application updated.");
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      onClose();
    },
    onError: () => toast("Couldn't update the application.", "danger"),
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
          {application.name}{" "}
          <span className="text-muted fw-normal fs-6">· {application.roleTitle ?? "General application"} · {fmt(application.createdAt)}</span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="row">
          <div className="col-md-6">
            {row("Email", application.email)}
            {row("Phone", application.phone)}
            {row(
              "Portfolio",
              application.portfolioUrl
            )}
          </div>
          <div className="col-md-6">{row("Message", application.message)}</div>
        </div>
        <div className="d-flex align-items-end gap-3 mt-2">
          <div>
            <Form.Label className="small text-muted text-uppercase mb-1">Status</Form.Label>
            <Form.Select value={status} onChange={(e) => setStatus(e.target.value as ApplicationStatus)} style={{ width: 180 }}>
              {APPLICATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Form.Select>
          </div>
          {application.hasCv && (
            <Button variant="outline-primary" href={`${API_URL}/api/v1/admin/applications/${application.id}/cv`}>
              <i className="bi bi-download me-1" aria-hidden="true"></i>Download CV
            </Button>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer className="justify-content-between">
        <Button variant="outline-danger" onClick={onDelete}>
          <i className="bi bi-trash me-1" aria-hidden="true"></i>Delete
        </Button>
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => save.mutate()} disabled={status === application.status || save.isPending}>
            {save.isPending && <Spinner size="sm" className="me-2" />}
            Save changes
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
