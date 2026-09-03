import { Route, Routes } from "react-router-dom";
import { RequireAuth, RequireRole } from "./auth/AuthContext";
import Shell from "./layout/Shell";
import AcceptInvite from "./pages/AcceptInvite";
import Careers from "./pages/Careers";
import ForgotPassword from "./pages/ForgotPassword";
import Leads from "./pages/Leads";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import ResetPassword from "./pages/ResetPassword";
import Subscribers from "./pages/Subscribers";
import Team from "./pages/Team";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        element={
          <RequireAuth>
            <Shell />
          </RequireAuth>
        }
      >
        <Route index element={<Overview />} />
        <Route
          path="/leads"
          element={
            <RequireRole roles={["ADMIN", "EDITOR", "VIEWER"]}>
              <Leads />
            </RequireRole>
          }
        />
        <Route
          path="/subscribers"
          element={
            <RequireRole roles={["ADMIN", "EDITOR", "VIEWER"]}>
              <Subscribers />
            </RequireRole>
          }
        />
        <Route
          path="/careers"
          element={
            <RequireRole roles={["ADMIN", "RECRUITER"]}>
              <Careers />
            </RequireRole>
          }
        />
        <Route
          path="/team"
          element={
            <RequireRole roles={["ADMIN"]}>
              <Team />
            </RequireRole>
          }
        />
        <Route path="*" element={<Overview />} />
      </Route>
    </Routes>
  );
}
