import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';

import AppLayout from './layout/AppLayout';
import AppToast from './components/AppToast';
import SetupLayout from './layout/SetupLayout';
import DashboardPage from './pages/DashboardPage';
import InventoryMovementsPage from './pages/InventoryMovementsPage';
import MaterialsPage from './pages/MaterialsPage';
import PlaceholderPage from './pages/PlaceholderPage';
import CustomersPage from './pages/CustomersPage';
import SuppliersPage from './pages/SuppliersPage';
import AssetsPage from './pages/AssetsPage';
import AssetDetailPage from './pages/AssetDetailPage';
import ProfilePage from './pages/ProfilePage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import OrganizationPage from './pages/setup/OrganizationPage';
import WarehousesPage from './pages/setup/WarehousesPage';
import ItemGroupsPage from './pages/setup/ItemGroupsPage';
import TranslationsPage from './pages/setup/TranslationsPage';
import UnitsPage from './pages/setup/UnitsPage';
import AssetTypesPage from './pages/setup/AssetTypesPage';
import type { RootState } from './store';
import type { AppDispatch } from './store';
import { fetchI18nTranslations } from './store/i18nSlice';

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
  const dispatch = useDispatch<AppDispatch>();
  const organizationId = useSelector((state: RootState) => state.user.organizationId);
  const locale = useSelector((state: RootState) => state.i18n.locale);

  useEffect(() => {
    if (!organizationId) return;
    dispatch(fetchI18nTranslations({ organizationId, locale }));
  }, [dispatch, organizationId, locale]);

  return (
    <>
      <AppToast />
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
            <Route path="/assets" element={<AssetsPage />} />
            <Route path="/assets/:assetId" element={<AssetDetailPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/reports" element={<PlaceholderPage title="Reports" />} />
            <Route path="/setup" element={<SetupLayout />}>
              <Route index element={<Navigate to="/setup/organization" replace />} />
              <Route path="organization" element={<OrganizationPage />} />
              <Route path="warehouses" element={<WarehousesPage />} />
              <Route path="item-groups" element={<ItemGroupsPage />} />
              <Route path="asset-types" element={<AssetTypesPage />} />
              <Route path="translations" element={<TranslationsPage />} />
              <Route path="units" element={<UnitsPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/auth/login" replace />} />
      </Routes>
    </>
  );
}
