import { useMemo, useState, type FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { SelectButton } from 'primereact/selectbutton';

import AuthShell from '../../components/AuthShell';
import type { AppDispatch, RootState } from '../../store';
import { clearAuthMessages, registerOrganization } from '../../store/authSlice';
import { enqueueToast } from '../../store/uiSlice';

export default function RegisterPage() {
  const dispatch = useDispatch<AppDispatch>();
  const auth = useSelector((s: RootState) => s.auth);
  const navigate = useNavigate();
  const [organizationName, setOrganizationName] = useState('');
  const [organizationCode, setOrganizationCode] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [language, setLanguage] = useState<'tr' | 'en'>('tr');

  const passwordPt = {
    root: { className: 'w-full' },
    iconField: { className: 'w-full' },
    input: { className: 'w-full' }
  } as const;

  const languageOptions = useMemo(
    () => [
      { label: 'Türkçe', value: 'tr' },
      { label: 'English', value: 'en' }
    ],
    []
  );

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    dispatch(clearAuthMessages());

    if (adminPassword !== confirmPassword) {
      dispatch(
        enqueueToast({
          severity: 'error',
          summary: 'Hata',
          detail: 'Şifreler eşleşmiyor.'
        })
      );
      return;
    }

    try {
      await dispatch(
        registerOrganization({
          organizationName,
          organizationCode,
          adminName,
          adminEmail,
          adminPassword,
          language
        })
      ).unwrap();
      navigate('/auth/login');
    } catch {
    }
  };

  return (
    <AuthShell
      heroTitle="Welcome To"
      heroSubtitle="PlantTrack"
      heroDescription="Organizasyonunu dakikalar içinde oluştur, ekip ve cihaz yönetimini tek panelde başlat."
      heroIcon="pi pi-building"
    >
      <div className="mb-6 space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">Organizasyon Oluştur</h2>
        <p className="text-sm text-slate-500">Yeni bir ekip hesabı oluşturarak PlantTrack kullanmaya başla.</p>
      </div>

      <Card className="border-0 p-0 shadow-none">
        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Organizasyon adı</span>
            <InputText
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="Örn: Green Valley"
              className="p-inputtext-sm w-full text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:shadow-none focus:outline-none"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Organizasyon kodu</span>
            <InputText
              value={organizationCode}
              onChange={(e) => setOrganizationCode(e.target.value)}
              placeholder="Opsiyonel"
              className="p-inputtext-sm w-full"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Admin adı</span>
            <InputText
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              className="p-inputtext-sm w-full"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Admin email</span>
            <InputText
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="p-inputtext-sm w-full"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Admin şifre</span>
            <Password
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              toggleMask
              feedback={false}
              className="w-full"
              inputClassName="p-inputtext-sm w-full"
              pt={passwordPt}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Şifre tekrar</span>
            <Password
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              toggleMask
              feedback={false}
              className="w-full"
              inputClassName="p-inputtext-sm w-full"
              pt={passwordPt}
            />
          </label>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:gap-3">
            <Button
              type="submit"
              label="Organizasyonu Oluştur"
              icon="pi pi-user-plus"
              size="small"
              className="w-full sm:w-auto flex-1 !border-0 !shadow-lg !shadow-brand-500/25 !bg-gradient-to-r !from-brand-600 !to-brand-500 hover:brightness-110"
              loading={auth.loading}
            />
            <Link
              to="/auth/login"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              Giriş Yap
            </Link>
          </div>

        </form>
      </Card>
    </AuthShell>
  );
}
