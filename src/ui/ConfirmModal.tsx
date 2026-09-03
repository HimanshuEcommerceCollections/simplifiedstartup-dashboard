import type { ReactNode } from "react";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Spinner from "react-bootstrap/Spinner";

type ConfirmModalProps = {
  show: boolean;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  variant?: "danger" | "primary" | "warning";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** The house confirmation modal — every destructive/irreversible action goes through this. */
export default function ConfirmModal({
  show,
  title,
  children,
  confirmLabel = "Confirm",
  variant = "danger",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal show={show} onHide={busy ? undefined : onCancel} centered>
      <Modal.Header closeButton={!busy}>
        <Modal.Title className="fs-5">{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{children}</Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button variant={variant} onClick={onConfirm} disabled={busy}>
          {busy && <Spinner size="sm" className="me-2" />}
          {confirmLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
