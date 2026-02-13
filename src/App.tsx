import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { DashboardPage } from './pages/app/DashboardPage';
import { NewTransactionPage } from './pages/app/NewTransactionPage';
import { ProductsPage } from './pages/app/ProductsPage';
import { SettingsPage } from './pages/app/SettingsPage';
import { StockPage } from './pages/app/StockPage';
import { SettingsMachinesTab } from './pages/app/settings-tabs/SettingsMachinesTab';
import { SettingsOrganizationsTab } from './pages/app/settings-tabs/SettingsOrganizationsTab';
import { SettingsProductsTab } from './pages/app/settings-tabs/SettingsProductsTab';
import { SettingsUsersTab } from './pages/app/settings-tabs/SettingsUsersTab';
import { SettingsWarehousesTab } from './pages/app/settings-tabs/SettingsWarehousesTab';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { getAccessToken } from './services/api';
import { AppShellLayout } from './components/layout/AppShellLayout';

function ProtectedLayout(): React.JSX.Element {
  const location = useLocation();
  const token = getAccessToken();

  if (!token) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

function PublicOnlyLayout(): React.JSX.Element {
  const token = getAccessToken();

  if (token) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

function App(): React.JSX.Element {
  return (
    <Routes>
      <Route element={<PublicOnlyLayout />}>
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      <Route element={<ProtectedLayout />}>
        <Route element={<AppShellLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/stock" element={<StockPage />} />
          <Route path="/stock/new" element={<NewTransactionPage />} />
          <Route path="/settings" element={<SettingsPage />}>
            <Route index element={<Navigate to="users" replace />} />
            <Route path="users" element={<SettingsUsersTab />} />
            <Route path="organizations" element={<SettingsOrganizationsTab />} />
            <Route path="warehouses" element={<SettingsWarehousesTab />} />
            <Route path="machines" element={<SettingsMachinesTab />} />
            <Route path="products" element={<SettingsProductsTab />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
