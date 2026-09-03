import { NavLink, Outlet, useNavigate } from "react-router-dom";
import Badge from "react-bootstrap/Badge";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../ui/Toasts";
import type { Role } from "../api/types";

const NAV_ITEMS: { to: string; label: string; icon: string; roles: Role[] }[] = [
  { to: "/", label: "Overview", icon: "bi-speedometer2", roles: ["ADMIN", "EDITOR", "RECRUITER", "VIEWER"] },
  { to: "/leads", label: "Leads", icon: "bi-person-lines-fill", roles: ["ADMIN", "EDITOR", "VIEWER"] },
  { to: "/subscribers", label: "Subscribers", icon: "bi-envelope-paper", roles: ["ADMIN", "EDITOR", "VIEWER"] },
  { to: "/careers", label: "Careers", icon: "bi-briefcase", roles: ["ADMIN", "RECRUITER"] },
  { to: "/team", label: "Team", icon: "bi-people", roles: ["ADMIN"] },
];

export default function Shell() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  async function onLogout() {
    try {
      await logout();
      navigate("/login");
    } catch {
      toast("Logout failed — try again.", "danger");
    }
  }

  return (
    <div className="d-flex min-vh-100 bg-light">
      <aside className="shell-sidebar d-flex flex-column p-3 text-white">
        <div className="d-flex align-items-center gap-2 mb-4 px-1">
          <span className="brand-dot" aria-hidden="true"></span>
          <span className="fw-bold">Simplified Startup</span>
        </div>
        <nav className="nav nav-pills flex-column gap-1">
          {NAV_ITEMS.filter((item) => user && item.roles.includes(user.role)).map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/"} className="nav-link d-flex align-items-center gap-2">
              <i className={`bi ${item.icon}`} aria-hidden="true"></i>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto pt-3 border-top border-secondary">
          <div className="small text-truncate">{user?.name ?? user?.email}</div>
          <div className="d-flex align-items-center justify-content-between mt-1">
            <Badge bg="secondary">{user?.role}</Badge>
            <button className="btn btn-link btn-sm text-white-50 p-0" onClick={onLogout}>
              <i className="bi bi-box-arrow-right me-1" aria-hidden="true"></i>Sign out
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-grow-1 p-4 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
