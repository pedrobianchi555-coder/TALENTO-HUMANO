import { BrowserRouter as Router, Routes, Route } from "react-router";
import { AuthProvider } from "@getmocha/users-service/react";
import AppLayout from "@/react-app/components/AppLayout";
import HomePage from "@/react-app/pages/Home";
import AuthCallbackPage from "@/react-app/pages/AuthCallback";
import DashboardPage from "@/react-app/pages/Dashboard";
import ProfileSetupPage from "@/react-app/pages/ProfileSetup";
import EmployeesPage from "@/react-app/pages/Employees";
import RequestsPage from "@/react-app/pages/Requests";
import DocumentsPage from "@/react-app/pages/Documents";
import LoansPage from "@/react-app/pages/Loans";
import EvaluationsPage from "@/react-app/pages/Evaluations";
import EventsPage from "@/react-app/pages/Events";
import ComplaintsPage from "@/react-app/pages/Complaints";
import AssetsPage from "@/react-app/pages/Assets";
import ChatPage from "@/react-app/pages/Chat";
import RecruitmentPage from "@/react-app/pages/Recruitment";
import BirthdaysPage from "@/react-app/pages/Birthdays";
import Profile from "@/react-app/pages/Profile";
import PermissionsAdmin from "@/react-app/pages/PermissionsAdmin";
import PayslipsPage from "@/react-app/pages/Payslips";
import WhatsAppSettings from "@/react-app/pages/WhatsAppSettings";
import BackupManagement from "@/react-app/pages/BackupManagement";
import AuditLog from "@/react-app/pages/AuditLog";
import RequestResponseDashboard from "@/react-app/pages/RequestResponseDashboard";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          
          {/* Protected routes with sidebar layout */}
          <Route path="/dashboard" element={<AppLayout><DashboardPage /></AppLayout>} />
          <Route path="/profile-setup" element={<ProfileSetupPage />} />
          <Route path="/profile" element={<AppLayout><Profile /></AppLayout>} />
          <Route path="/employees" element={<AppLayout><EmployeesPage /></AppLayout>} />
          <Route path="/requests" element={<AppLayout><RequestsPage /></AppLayout>} />
          <Route path="/documents" element={<AppLayout><DocumentsPage /></AppLayout>} />
          <Route path="/loans" element={<AppLayout><LoansPage /></AppLayout>} />
          <Route path="/evaluations" element={<AppLayout><EvaluationsPage /></AppLayout>} />
          <Route path="/events" element={<AppLayout><EventsPage /></AppLayout>} />
          <Route path="/complaints" element={<AppLayout><ComplaintsPage /></AppLayout>} />
          <Route path="/assets" element={<AppLayout><AssetsPage /></AppLayout>} />
          <Route path="/chat" element={<AppLayout><ChatPage /></AppLayout>} />
          <Route path="/recruitment" element={<AppLayout><RecruitmentPage /></AppLayout>} />
          <Route path="/birthdays" element={<AppLayout><BirthdaysPage /></AppLayout>} />
          <Route path="/permissions" element={<AppLayout><PermissionsAdmin /></AppLayout>} />
          <Route path="/payslips" element={<AppLayout><PayslipsPage /></AppLayout>} />
          <Route path="/whatsapp-settings" element={<AppLayout><WhatsAppSettings /></AppLayout>} />
          <Route path="/backups" element={<AppLayout><BackupManagement /></AppLayout>} />
          <Route path="/audit-log" element={<AppLayout><AuditLog /></AppLayout>} />
          <Route path="/request-reports" element={<AppLayout><RequestResponseDashboard /></AppLayout>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
