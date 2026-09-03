import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Spinner from "react-bootstrap/Spinner";
import { api } from "../api/client";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/auth/forgot-password", { email });
    } finally {
      // The server always answers ok (no account enumeration) — mirror that here.
      setBusy(false);
      setSent(true);
    }
  }

  return (
    <div className="auth-page">
      <Card className="auth-card shadow-sm">
        <Card.Body className="p-4">
          <h1 className="fs-4 mb-1">Reset your password</h1>
          {sent ? (
            <div className="alert alert-success py-2 mt-3">
              If an account exists for <b>{email}</b>, a reset link is on its way. The link expires in 1 hour.
            </div>
          ) : (
            <>
              <p className="text-muted small">Enter your account email and we&apos;ll send a reset link.</p>
              <Form onSubmit={onSubmit}>
                <Form.Group className="mb-3" controlId="fpEmail">
                  <Form.Label>Email</Form.Label>
                  <Form.Control type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
                </Form.Group>
                <Button type="submit" className="w-100" disabled={busy}>
                  {busy && <Spinner size="sm" className="me-2" />}
                  Send reset link
                </Button>
              </Form>
            </>
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
