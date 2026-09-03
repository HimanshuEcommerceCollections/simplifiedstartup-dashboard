import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Spinner from "react-bootstrap/Spinner";
import { api, ApiError } from "../api/client";
import { useToast } from "../ui/Toasts";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post("/auth/reset-password", { token, password });
      toast("Password updated — sign in with the new one.");
      navigate("/login", { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 400
          ? "This reset link is invalid or has expired — request a new one."
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
          <h1 className="fs-4 mb-1">Choose a new password</h1>
          {!token ? (
            <div className="alert alert-warning py-2 mt-3">This page needs a reset link — check your email.</div>
          ) : (
            <Form onSubmit={onSubmit} className="mt-3">
              <Form.Group className="mb-3" controlId="rpPassword">
                <Form.Label>New password</Form.Label>
                <Form.Control
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoFocus
                  autoComplete="new-password"
                />
                <Form.Text>At least 8 characters. All existing sessions will be signed out.</Form.Text>
              </Form.Group>
              {error && <div className="alert alert-danger py-2">{error}</div>}
              <Button type="submit" className="w-100" disabled={busy}>
                {busy && <Spinner size="sm" className="me-2" />}
                Set password
              </Button>
            </Form>
          )}
          <div className="text-center mt-3">
            <Link to="/login" className="small">
              Back to sign in
            </Link>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
