import { useSelector } from 'react-redux';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';

import AppLayout from './layout/AppLayout';
import SetupLayout from './layout/SetupLayout';
import DashboardPage from './pages/DashboardPage';
import InventoryMovementsPage from './pages/InventoryMovementsPage';
import MaterialsPage from './pages/MaterialsPage';
import PlaceholderPage from './pages/PlaceholderPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import OrganizationPage from './pages/setup/OrganizationPage';
import WarehousesPage from './pages/setup/WarehousesPage';
import type { RootState } from './store';

function ProtectedRoute() {
  const isAuthenticated = useSelector((state: RootState) => state.user.authenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

function AuthOnlyRoute() {
  const isAuthenticated = useSelector((state: RootState) => state.user.authenticated);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<AuthOnlyRoute />}>
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/inventory" element={<InventoryMovementsPage />} />
          <Route path="/materials" element={<MaterialsPage />} />
          <Route path="/reports" element={<PlaceholderPage title="Reports" />} />
          <Route path="/setup" element={<SetupLayout />}>
            <Route index element={<Navigate to="/setup/organization" replace />} />
            <Route path="organization" element={<OrganizationPage />} />
            <Route path="warehouses" element={<WarehousesPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/auth/login" replace />} />
    </Routes>
  );
}
