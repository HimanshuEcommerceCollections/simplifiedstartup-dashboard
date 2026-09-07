import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import Badge from "react-bootstrap/Badge";
import Offcanvas from "react-bootstrap/Offcanvas";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../ui/Toasts";
import type { Role } from "../api/types";

const NAV_ITEMS: { to: string; label: string; icon: string; roles: Role[] }[] = [
  { to: "/", label: "Overview", icon: "bi-speedometer2", roles: ["ADMIN", "EDITOR", "CONTENT_WRITER", "RECRUITER", "VIEWER"] },
  { to: "/leads", label: "Leads", icon: "bi-person-lines-fill", roles: ["ADMIN", "EDITOR", "VIEWER"] },
  { to: "/subscribers", label: "Subscribers", icon: "bi-envelope-paper", roles: ["ADMIN", "EDITOR", "VIEWER"] },
  { to: "/content", label: "Content", icon: "bi-journal-text", roles: ["ADMIN", "EDITOR", "CONTENT_WRITER", "VIEWER"] },
  { to: "/careers", label: "Careers", icon: "bi-briefcase", roles: ["ADMIN", "RECRUITER"] },
  { to: "/team", label: "Team", icon: "bi-people", roles: ["ADMIN"] },
];

function Brand() {
  return (
    <div className="d-flex align-items-center gap-2">
      <img className="brand-mark" src="/logo.png" alt="" aria-hidden="true" />
      <span className="fw-bold">Simplified Startup</span>
    </div>
  );
}

/** Nav list + user footer — shared by the desktop sidebar and the mobile offcanvas. */
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
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
    <>
      <nav className="nav nav-pills flex-column gap-1">
        {NAV_ITEMS.filter((item) => user && item.roles.includes(user.role)).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className="nav-link d-flex align-items-center gap-2"
            onClick={onNavigate}
          >
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
    </>
  );
}

export default function Shell() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    // viewport-locked shell: only <main> scrolls, so the sidebar (and its
    // sign-out footer) stay on screen however long a table page gets
    <div className="d-flex flex-column flex-lg-row vh-100 overflow-hidden bg-light">
      {/* mobile top bar */}
      <header className="shell-topbar d-lg-none d-flex align-items-center justify-content-between text-white px-3 py-2">
        <Brand />
        <button className="btn btn-outline-light btn-sm" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
          <i className="bi bi-list fs-5" aria-hidden="true"></i>
        </button>
      </header>

      {/* desktop sidebar */}
      <aside className="shell-sidebar d-none d-lg-flex flex-column p-3 text-white">
        <div className="mb-4 px-1">
          <Brand />
        </div>
        <SidebarContent />
      </aside>

      {/* mobile drawer */}
      <Offcanvas show={menuOpen} onHide={() => setMenuOpen(false)} className="shell-offcanvas text-white" responsive="lg">
        <Offcanvas.Header closeButton closeVariant="white" className="d-lg-none">
          <Offcanvas.Title as="div">
            <Brand />
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="d-flex d-lg-none flex-column p-3 pt-0">
          <SidebarContent onNavigate={() => setMenuOpen(false)} />
        </Offcanvas.Body>
      </Offcanvas>

      <main className="shell-main flex-grow-1 p-3 p-lg-4 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
