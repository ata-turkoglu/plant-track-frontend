import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';

import AuthShell from '../../components/AuthShell';
import { api } from '../../services/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/api/auth/forgot-password', { email });
      setSuccess(response.data.message ?? 'Sıfırlama bağlantısı gönderildi.');
    } catch {
      setError('Şifre sıfırlama isteği gönderilemedi.');
    } finally {
      setLoading(false);
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

          {error && <Message severity="error" text={error} className="w-full" />}
          {success && <Message severity="success" text={success} className="w-full" />}
        </form>
      </Card>
    </AuthShell>
  );
}
