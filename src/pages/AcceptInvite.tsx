import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Spinner from "react-bootstrap/Spinner";
import { api, ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export default function AcceptInvite() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refresh } = useAuth();
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post("/auth/accept-invite", { token, name, password });
      await refresh();
      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 400
          ? "This invite link is invalid or has expired — ask your admin to resend it."
          : "Something went wrong — try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <Card className="auth-card shadow-sm">
        <Card.Body className="p-4">
          <h1 className="fs-4 mb-1">Welcome aboard</h1>
          <p className="text-muted small">Set your name and password to activate your account.</p>
          {!token ? (
            <div className="alert alert-warning py-2">This page needs an invite link — check the email you received.</div>
          ) : (
            <Form onSubmit={onSubmit}>
              <Form.Group className="mb-3" controlId="aiName">
                <Form.Label>Your name</Form.Label>
                <Form.Control value={name} onChange={(e) => setName(e.target.value)} required autoFocus autoComplete="name" />
              </Form.Group>
              <Form.Group className="mb-3" controlId="aiPassword">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <Form.Text>At least 8 characters.</Form.Text>
              </Form.Group>
              {error && <div className="alert alert-danger py-2">{error}</div>}
              <Button type="submit" className="w-100" disabled={busy}>
                {busy && <Spinner size="sm" className="me-2" />}
                Accept invite &amp; sign in
              </Button>
            </Form>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
