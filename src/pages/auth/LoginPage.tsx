import { useState, type FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Message } from 'primereact/message';

import AuthShell from '../../components/AuthShell';
import type { AppDispatch, RootState } from '../../store';
import { clearAuthMessages, loginUser } from '../../store/authSlice';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((s: RootState) => s.auth);
  const navigate = useNavigate();
  const location = useLocation();

  const passwordPt = {
    root: { className: 'w-full' },
    iconField: { className: 'w-full' },
    input: { className: 'w-full' }
  } as const;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    dispatch(clearAuthMessages());

    try {
      await dispatch(loginUser({ email, password, remember })).unwrap();

      const redirectTo = (location.state as { from?: string } | null)?.from ?? '/';
      navigate(redirectTo, { replace: true });
    } catch {
    }
  };

  return (
    <AuthShell
      heroTitle="Welcome To"
      heroSubtitle="PlantTrack"
      heroDescription="Sera operasyonlarını izle, ekibini yönet, üretimi tek ekrandan büyüt."
      heroIcon="pi pi-rocket"
    >
      <div className="mb-6 space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">Giriş Yap</h2>
        <p className="text-sm text-slate-500">Hesabına giriş yaparak panele devam et.</p>
      </div>

      <Card className="border-0 p-0 shadow-none">
        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <InputText
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="p-inputtext-sm w-full"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Şifre</span>
            <Password
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Şifren"
              toggleMask
              feedback={false}
              className="w-full"
              inputClassName="p-inputtext-sm w-full"
              pt={passwordPt}
            />
          </label>

          <div className="flex items-center justify-between text-sm text-slate-600">
            <label className="inline-flex items-center gap-2">
              <Checkbox
                inputId="remember-me"
                checked={remember}
                onChange={(e) => setRemember(Boolean(e.checked))}
              />
              <span>Beni hatırla</span>
            </label>
            <Link to="/auth/forgot-password" className="font-medium text-brand-600 hover:text-brand-700">
              Şifremi unuttum
            </Link>
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:gap-3">
            <Button
              type="submit"
              label="Giriş Yap"
              icon="pi pi-sign-in"
              size="small"
              className="w-full sm:w-auto flex-1 !border-0 !shadow-lg !shadow-brand-500/25 !bg-gradient-to-r !from-brand-600 !to-brand-500 hover:brightness-110"
              loading={loading}
            />
            <Link
              to="/auth/register"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              Hesap Oluştur
            </Link>
          </div>

          {error && <Message severity="error" text={error} className="w-full" />}
        </form>
      </Card>
    </AuthShell>
  );
}
