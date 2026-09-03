import Card from "react-bootstrap/Card";
import Placeholder from "react-bootstrap/Placeholder";

/** Skeleton rows shaped like a table while a list loads. */
export function TableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <tbody>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }, (_, c) => (
            <td key={c}>
              <Placeholder animation="wave">
                <Placeholder xs={c === 0 ? 8 : 6} />
              </Placeholder>
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

/** Skeleton stat card for the overview while numbers load. */
export function StatSkeleton() {
  return (
    <Card className="shadow-sm">
      <Card.Body>
        <Placeholder as={Card.Subtitle} animation="wave">
          <Placeholder xs={6} />
        </Placeholder>
        <Placeholder as={Card.Title} animation="wave" className="mt-2 mb-0">
          <Placeholder xs={3} size="lg" />
        </Placeholder>
      </Card.Body>
    </Card>
  );
}
