import { useQuery } from "@tanstack/react-query";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import { api } from "../api/client";
import type { StatsDto } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { StatSkeleton } from "../ui/skeletons";

function StatCard({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <Card className="shadow-sm h-100">
      <Card.Body>
        <Card.Subtitle className="text-muted small text-uppercase">{label}</Card.Subtitle>
        <div className="stat-number">{value}</div>
        {hint && <div className="text-muted small">{hint}</div>}
      </Card.Body>
    </Card>
  );
}

export default function Overview() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: () => api.get<{ stats: StatsDto }>("/admin/stats"),
  });
  const stats = data?.stats;

  return (
    <>
      <h1 className="fs-3 mb-1">Overview</h1>
      <p className="text-muted">Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}.</p>
      <Row className="g-3" xs={1} sm={2} xl={4}>
        {isLoading || !stats ? (
          Array.from({ length: 4 }, (_, i) => (
            <Col key={i}>
              <StatSkeleton />
            </Col>
          ))
        ) : (
          <>
            <Col>
              <StatCard label="New leads" value={stats.leads.new} hint="awaiting first contact" />
            </Col>
            <Col>
              <StatCard label="Leads total" value={stats.leads.total} hint={`${stats.leads.won} won · ${stats.leads.booked} booked`} />
            </Col>
            <Col>
              <StatCard label="Subscribers" value={stats.subscribers} hint="newsletter list" />
            </Col>
            <Col>
              <StatCard label="Team" value={stats.users} hint="active & invited" />
            </Col>
          </>
        )}
      </Row>
    </>
  );
}
