import { useState, type FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';

import AuthShell from '../../components/AuthShell';
import type { AppDispatch, RootState } from '../../store';
import { clearAuthMessages, requestPasswordReset } from '../../store/authSlice';

export default function ForgotPasswordPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { loading } = useSelector((s: RootState) => s.auth);
  const [email, setEmail] = useState('');

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    dispatch(clearAuthMessages());

    try {
      await dispatch(requestPasswordReset({ email })).unwrap();
    } catch {
    }
  };

  return (
    <AuthShell
      heroTitle="Reset Access"
      heroSubtitle="PlantTrack"
      heroDescription="Hesabına güvenli şekilde tekrar erişebilmen için sıfırlama adımlarını başlat."
      heroIcon="pi pi-refresh"
    >
      <div className="mb-6 space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">Şifre Sıfırla</h2>
        <p className="text-sm text-slate-500">Kayıtlı e-posta adresini gir, sıfırlama bağlantısını gönderelim.</p>
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

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:gap-3">
            <Button
              type="submit"
              label="Sıfırlama Linki Gönder"
              icon="pi pi-send"
              size="small"
              className="w-full sm:w-auto flex-1 !border-0 !shadow-lg !shadow-brand-500/25 !bg-gradient-to-r !from-brand-600 !to-brand-500 hover:brightness-110"
              loading={loading}
            />
            <Link
              to="/auth/login"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              Girişe Dön
            </Link>
          </div>
        </form>
      </Card>
    </AuthShell>
  );
}
