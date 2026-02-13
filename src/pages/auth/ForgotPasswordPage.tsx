import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Rocket } from 'lucide-react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { AuthShell } from '../../components/auth/AuthShell';
import { authApi } from '../../services/authApi';

export function ForgotPasswordPage(): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await authApi.forgotPassword(email);
      setMessage('Eger bu e-posta sistemde varsa sifre sifirlama talimati gonderildi.');
    } catch {
      setError('Islem su anda tamamlanamadi. Lutfen tekrar dene.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      heroTitle="Erisimi sifirla"
      heroSubtitle="PlantTrack"
      heroDescription="Hesabina tekrar erismek icin e-posta adresini gir."
      heroIcon={<Rocket className="h-6 w-6" />}
    >
      <div className="mb-6 space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">Sifremi unuttum</h2>
        <p className="text-sm text-slate-500">Sifreni yenilemek icin e-posta adresini yaz.</p>
      </div>

      <form className="space-y-4 rounded-2xl bg-white p-6 shadow-sm" onSubmit={onSubmit}>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">E-posta</span>
          <InputText
            id="forgot-password-email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            size="small"
            className="p-inputtext-sm"
            required
          />
        </label>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
          <Button
            type="submit"
            label="Sifirlama baglantisi gonder"
            icon="pi pi-envelope"
            loading={loading}
            size="small"
            className="w-full sm:flex-1"
          />
          <Link
            to="/auth/login"
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-2 text-slate-700 transition hover:bg-slate-50"
          >
            Girise don
          </Link>
        </div>

        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>
    </AuthShell>
  );
}
