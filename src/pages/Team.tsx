import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import Dropdown from "react-bootstrap/Dropdown";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import Spinner from "react-bootstrap/Spinner";
import Table from "react-bootstrap/Table";
import { api, ApiError } from "../api/client";
import { ROLES, type Role, type UserDto } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import ConfirmModal from "../ui/ConfirmModal";
import { TableSkeleton } from "../ui/skeletons";
import { useToast } from "../ui/Toasts";

const ROLE_HELP: Record<Role, string> = {
  ADMIN: "Everything, including team management",
  EDITOR: "Leads, subscribers, and website content",
  RECRUITER: "Career postings and job applications",
  VIEWER: "Read-only access",
};

const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

type PendingAction =
  | { kind: "role"; user: UserDto; role: Role }
  | { kind: "disable"; user: UserDto }
  | { kind: "enable"; user: UserDto }
  | { kind: "revoke"; user: UserDto };

export default function Team() {
  const { user: me } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get<{ items: UserDto[] }>("/admin/users"),
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["users"] });
    queryClient.invalidateQueries({ queryKey: ["stats"] });
  };

  const act = useMutation({
    mutationFn: async (action: PendingAction) => {
      if (action.kind === "role") return api.patch(`/admin/users/${action.user.id}`, { role: action.role });
      if (action.kind === "disable") return api.patch(`/admin/users/${action.user.id}`, { status: "disabled" });
      if (action.kind === "enable") return api.patch(`/admin/users/${action.user.id}`, { status: "active" });
      return api.del(`/admin/users/${action.user.id}`);
    },
    onSuccess: (_data, action) => {
      const messages = {
        role: "Role updated.",
        disable: "User disabled — their sessions were signed out.",
        enable: "User re-enabled.",
        revoke: "Invite revoked.",
      } as const;
      toast(messages[action.kind]);
      setPending(null);
      refetch();
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : "Action failed.", "danger"),
  });

  const resend = useMutation({
    mutationFn: (id: string) => api.post(`/admin/users/${id}/resend-invite`),
    onMutate: (id) => setResendingId(id),
    onSettled: () => setResendingId(null),
    onSuccess: () => toast("Invite re-sent."),
    onError: () => toast("Couldn't resend the invite.", "danger"),
  });

  const confirmCopy: Record<PendingAction["kind"], { title: string; label: string; variant: "danger" | "primary" | "warning" }> = {
    role: { title: "Change role?", label: "Change role", variant: "primary" },
    disable: { title: "Disable this user?", label: "Disable user", variant: "danger" },
    enable: { title: "Re-enable this user?", label: "Re-enable", variant: "primary" },
    revoke: { title: "Revoke this invite?", label: "Revoke invite", variant: "danger" },
  };

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-3">
        <div>
          <h1 className="fs-3 mb-0">Team</h1>
          <span className="text-muted small">The dashboard is invite-only — add people with a role.</span>
        </div>
        <Button onClick={() => setShowInvite(true)}>
          <i className="bi bi-person-plus me-1" aria-hidden="true"></i>Invite user
        </Button>
      </div>

      <div className="card shadow-sm">
        <Table hover responsive className="mb-0 align-middle">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Invited by</th>
              <th>Added</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          {isLoading ? (
            <TableSkeleton rows={4} cols={6} />
          ) : (
            <tbody>
              {data?.items.map((u) => {
                const isMe = u.id === me?.id;
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="fw-semibold">
                        {u.name ?? <span className="text-muted fst-italic">no name yet</span>} {isMe && <Badge bg="light" text="dark">you</Badge>}
                      </div>
                      <div className="text-muted small">{u.email}</div>
                    </td>
                    <td>
                      <Badge bg="secondary">{u.role}</Badge>
                    </td>
                    <td>
                      <Badge bg={u.status === "active" ? "success" : u.status === "invited" ? "warning" : "dark"}>{u.status}</Badge>
                    </td>
                    <td className="text-muted">{u.invitedByName ?? "—"}</td>
                    <td className="text-muted">{fmt(u.createdAt)}</td>
                    <td className="text-end">
                      {!isMe && (
                        <div className="d-inline-flex gap-1">
                          {u.status === "invited" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline-primary"
                                disabled={resendingId === u.id}
                                onClick={() => resend.mutate(u.id)}
                              >
                                {resendingId === u.id ? <Spinner size="sm" /> : <i className="bi bi-envelope-arrow-up" aria-hidden="true"></i>}
                                <span className="ms-1">Resend</span>
                              </Button>
                              <Button size="sm" variant="outline-danger" onClick={() => setPending({ kind: "revoke", user: u })}>
                                Revoke
                              </Button>
                            </>
                          )}
                          {u.status !== "invited" && (
                            <Dropdown align="end">
                              <Dropdown.Toggle size="sm" variant="outline-secondary">
                                Manage
                              </Dropdown.Toggle>
                              <Dropdown.Menu>
                                <Dropdown.Header>Change role</Dropdown.Header>
                                {ROLES.filter((r) => r !== u.role).map((r) => (
                                  <Dropdown.Item key={r} onClick={() => setPending({ kind: "role", user: u, role: r })}>
                                    {r} <span className="text-muted small">— {ROLE_HELP[r]}</span>
                                  </Dropdown.Item>
                                ))}
                                <Dropdown.Divider />
                                {u.status === "active" ? (
                                  <Dropdown.Item className="text-danger" onClick={() => setPending({ kind: "disable", user: u })}>
                                    Disable user
                                  </Dropdown.Item>
                                ) : (
                                  <Dropdown.Item onClick={() => setPending({ kind: "enable", user: u })}>Re-enable user</Dropdown.Item>
                                )}
                              </Dropdown.Menu>
                            </Dropdown>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          )}
        </Table>
      </div>

      <InviteModal show={showInvite} onClose={() => setShowInvite(false)} onInvited={refetch} />

      <ConfirmModal
        show={!!pending}
        title={pending ? confirmCopy[pending.kind].title : ""}
        confirmLabel={pending ? confirmCopy[pending.kind].label : ""}
        variant={pending ? confirmCopy[pending.kind].variant : "primary"}
        busy={act.isPending}
        onCancel={() => setPending(null)}
        onConfirm={() => pending && act.mutate(pending)}
      >
        {pending?.kind === "role" && (
          <>
            <b>{pending.user.name ?? pending.user.email}</b> becomes <Badge bg="secondary">{pending.role}</Badge> — {ROLE_HELP[pending.role].toLowerCase()}.
          </>
        )}
        {pending?.kind === "disable" && (
          <>
            <b>{pending.user.name ?? pending.user.email}</b> will lose access immediately and all their sessions will be signed out.
          </>
        )}
        {pending?.kind === "enable" && (
          <>
            <b>{pending.user.name ?? pending.user.email}</b> will be able to sign in again.
          </>
        )}
        {pending?.kind === "revoke" && (
          <>
            The invitation for <b>{pending.user.email}</b> will stop working.
          </>
        )}
      </ConfirmModal>
    </>
  );
}

function InviteModal({ show, onClose, onInvited }: { show: boolean; onClose: () => void; onInvited: () => void }) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("EDITOR");

  const invite = useMutation({
    mutationFn: () => api.post("/admin/users/invite", { email, role }),
    onSuccess: () => {
      toast(`Invite sent to ${email}.`);
      setEmail("");
      setRole("EDITOR");
      onInvited();
      onClose();
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : "Couldn't send the invite.", "danger"),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    invite.mutate();
  }

  return (
    <Modal show={show} onHide={invite.isPending ? undefined : onClose} centered>
      <Form onSubmit={onSubmit}>
        <Modal.Header closeButton={!invite.isPending}>
          <Modal.Title className="fs-5">Invite a user</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3" controlId="invEmail">
            <Form.Label>Email</Form.Label>
            <Form.Control type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus placeholder="person@company.com" />
            <Form.Text>They&apos;ll get an email with a link to set their password (valid 48 hours).</Form.Text>
          </Form.Group>
          <Form.Group controlId="invRole">
            <Form.Label>Role</Form.Label>
            <Form.Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r} — {ROLE_HELP[r]}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onClose} disabled={invite.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={invite.isPending || !email}>
            {invite.isPending && <Spinner size="sm" className="me-2" />}
            Send invite
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
