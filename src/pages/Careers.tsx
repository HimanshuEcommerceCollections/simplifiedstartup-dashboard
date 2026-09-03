import Card from "react-bootstrap/Card";

export default function Careers() {
  return (
    <>
      <h1 className="fs-3 mb-3">Careers</h1>
      <Card className="shadow-sm">
        <Card.Body className="text-center py-5">
          <i className="bi bi-briefcase fs-1 text-muted" aria-hidden="true"></i>
          <p className="mt-3 mb-1 fw-semibold">Career postings &amp; job applications land here in Phase 3.</p>
          <p className="text-muted mb-0">You&apos;ll be able to publish roles to the website and work applications through a pipeline.</p>
        </Card.Body>
      </Card>
    </>
  );
}
