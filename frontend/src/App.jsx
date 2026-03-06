import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/admin/LoginPage';
import DashboardPage from './pages/admin/DashboardPage';
import ClientsPage from './pages/admin/ClientsPage';
import ProposalsPage from './pages/admin/ProposalsPage';
import InvoicesPage from './pages/admin/InvoicesPage';
import FilesPage from './pages/admin/FilesPage';
import PortalPage from './pages/client/PortalPage';

function PrivateRoute({ children, requireRole }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f8f5]">
        <div className="w-6 h-6 border-2 border-[#2d7a2d] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (requireRole && role !== requireRole) {
    if (role === 'client') return <Navigate to="/portal" replace />;
    if (role === 'admin') return <Navigate to="/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
}

function RootRedirect() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f8f5]">
        <div className="w-6 h-6 border-2 border-[#2d7a2d] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role === 'admin') return <Navigate to="/dashboard" replace />;
  if (role === 'client') return <Navigate to="/portal" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={
          <PrivateRoute requireRole="admin">
            <DashboardPage />
          </PrivateRoute>
        } />
        <Route path="/admin" element={
          <PrivateRoute requireRole="admin">
            <ClientsPage />
          </PrivateRoute>
        } />
        <Route path="/admin/proposals" element={
          <PrivateRoute requireRole="admin">
            <ProposalsPage />
          </PrivateRoute>
        } />
        <Route path="/admin/invoices" element={
          <PrivateRoute requireRole="admin">
            <InvoicesPage />
          </PrivateRoute>
        } />
        <Route path="/admin/files" element={
          <PrivateRoute requireRole="admin">
            <FilesPage />
          </PrivateRoute>
        } />
        <Route path="/portal" element={
          <PrivateRoute requireRole="client">
            <PortalPage />
          </PrivateRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}