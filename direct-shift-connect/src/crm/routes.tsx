import { lazy } from "react";
import { Route } from "react-router-dom";
import AuthGuard from "./AuthGuard";
import CrmLayout from "./CrmLayout";

const LoginPage = lazy(() => import("./auth/LoginPage"));
const DashboardPage = lazy(() => import("./dashboard/DashboardPage"));
const DoctorsPage = lazy(() => import("./doctors/DoctorsPage"));
const DoctorDetailPage = lazy(() => import("./doctors/DoctorDetailPage"));
const HospitalsPage = lazy(() => import("./hospitals/HospitalsPage"));
const HospitalDetailPage = lazy(() => import("./hospitals/HospitalDetailPage"));
const ProjectsPage = lazy(() => import("./projects/ProjectsPage"));
const SocialPage = lazy(() => import("./social/SocialPage"));
const InvestorsPage = lazy(() => import("./investors/InvestorsPage"));
const EmailPage = lazy(() => import("./email/EmailPage"));
const ShiftsPage = lazy(() => import("./shifts/ShiftsPage"));
const TasksPage = lazy(() => import("./tasks/TasksPage"));

export function CrmRoutes() {
  return (
    <>
      <Route path="login" element={<LoginPage />} />
      <Route element={<AuthGuard />}>
        <Route element={<CrmLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="doctors" element={<DoctorsPage />} />
          <Route path="doctors/:id" element={<DoctorDetailPage />} />
          <Route path="hospitals" element={<HospitalsPage />} />
          <Route path="hospitals/:id" element={<HospitalDetailPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="social" element={<SocialPage />} />
          <Route path="investors" element={<InvestorsPage />} />
          <Route path="email" element={<EmailPage />} />
          <Route path="shifts" element={<ShiftsPage />} />
          <Route path="tasks" element={<TasksPage />} />
        </Route>
      </Route>
    </>
  );
}
